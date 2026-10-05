package com.shopplatform.subscription.service;

import com.shopplatform.common.exception.BusinessException;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.common.service.PaymentGatewayService;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.repository.ShopRepository;
import com.shopplatform.subscription.dto.ConfirmSubscriptionRequest;
import com.shopplatform.subscription.entity.SubscriptionPayment;
import com.shopplatform.subscription.entity.SubscriptionPlan;
import com.shopplatform.subscription.repository.SubscriptionPaymentRepository;
import com.shopplatform.subscription.repository.SubscriptionPlanRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Shop owner self-service subscription: pick a plan, pay online via
 * Razorpay, shop is activated/extended on verified payment. Renewal today
 * is manual (owner initiates it again before/after expiry); automatic
 * recurring billing can be layered on later via Razorpay Subscriptions.
 */
@Service
public class SubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final SubscriptionPaymentRepository paymentRepository;
    private final ShopRepository shopRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final String razorpayKeyId;

    public SubscriptionService(SubscriptionPlanRepository planRepository,
                                SubscriptionPaymentRepository paymentRepository,
                                ShopRepository shopRepository,
                                PaymentGatewayService paymentGatewayService,
                                @Value("${app.razorpay.key-id}") String razorpayKeyId) {
        this.planRepository = planRepository;
        this.paymentRepository = paymentRepository;
        this.shopRepository = shopRepository;
        this.paymentGatewayService = paymentGatewayService;
        this.razorpayKeyId = razorpayKeyId;
    }

    @Transactional(readOnly = true)
    public List<SubscriptionPlan> listActivePlans() {
        return planRepository.findAllByActiveTrue();
    }

    @Transactional
    public SubscriptionInitiation initiate(Long ownerId, Long shopId, Long planId) {
        Shop shop = getOwnedShop(ownerId, shopId);
        SubscriptionPlan plan = planRepository.findById(planId)
            .orElseThrow(() -> new ResourceNotFoundException("Plan not found"));
        if (!plan.isActive()) {
            throw new BusinessException("This plan is no longer available");
        }

        String receipt = "shop-" + shop.getId() + "-plan-" + plan.getId() + "-" + System.currentTimeMillis();
        String razorpayOrderId = paymentGatewayService.createOrder(plan.getPriceInPaise(), receipt);

        SubscriptionPayment payment = new SubscriptionPayment();
        payment.setShop(shop);
        payment.setPlan(plan);
        payment.setRazorpayOrderId(razorpayOrderId);
        payment.setAmountInPaise(plan.getPriceInPaise());
        paymentRepository.save(payment);

        return new SubscriptionInitiation(razorpayOrderId, plan.getPriceInPaise(), razorpayKeyId);
    }

    @Transactional
    public Shop confirm(Long ownerId, Long shopId, ConfirmSubscriptionRequest request) {
        Shop shop = getOwnedShop(ownerId, shopId);
        SubscriptionPayment payment = paymentRepository.findByRazorpayOrderId(request.razorpayOrderId())
            .orElseThrow(() -> new ResourceNotFoundException("Subscription payment not found"));
        if (!payment.getShop().getId().equals(shop.getId())) {
            throw new ResourceNotFoundException("Subscription payment not found");
        }

        boolean valid = paymentGatewayService.verifySignature(
            request.razorpayOrderId(), request.razorpayPaymentId(), request.razorpaySignature());
        if (!valid) {
            payment.setStatus(SubscriptionPayment.Status.FAILED);
            throw new BusinessException("Payment verification failed");
        }

        payment.setRazorpayPaymentId(request.razorpayPaymentId());
        payment.setStatus(SubscriptionPayment.Status.PAID);

        // Extend from the later of "now" or the current expiry, so renewing
        // before expiry stacks the new period on top rather than losing it.
        LocalDate base = (shop.getSubscriptionExpiresOn() != null && shop.getSubscriptionExpiresOn().isAfter(LocalDate.now()))
            ? shop.getSubscriptionExpiresOn()
            : LocalDate.now();
        shop.setSubscriptionExpiresOn(base.plusDays(payment.getPlan().getDurationDays()));
        shop.setSubscriptionStatus(Shop.SubscriptionStatus.ACTIVE);

        return shop;
    }

    /** Daily sweep: any ACTIVE shop whose paid period has lapsed is marked EXPIRED, gating storefront access. */
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void expireLapsedSubscriptions() {
        shopRepository.findAll().stream()
            .filter(shop -> shop.getSubscriptionStatus() == Shop.SubscriptionStatus.ACTIVE)
            .filter(shop -> shop.getSubscriptionExpiresOn() != null && shop.getSubscriptionExpiresOn().isBefore(LocalDate.now()))
            .forEach(shop -> shop.setSubscriptionStatus(Shop.SubscriptionStatus.EXPIRED));
    }

    private Shop getOwnedShop(Long ownerId, Long shopId) {
        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
        if (!shop.getOwner().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Shop not found");
        }
        return shop;
    }

    public record SubscriptionInitiation(String razorpayOrderId, long amountInPaise, String razorpayKeyId) {
    }
}
