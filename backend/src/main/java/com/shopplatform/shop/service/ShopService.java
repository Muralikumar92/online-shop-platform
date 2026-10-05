package com.shopplatform.shop.service;

import com.shopplatform.auth.entity.ShopOwner;
import com.shopplatform.auth.repository.ShopOwnerRepository;
import com.shopplatform.common.exception.BusinessException;
import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.common.service.S3Service;
import com.shopplatform.shop.dto.BankDetailsRequest;
import com.shopplatform.shop.dto.ContactDetailsRequest;
import com.shopplatform.shop.dto.CreateShopRequest;
import com.shopplatform.shop.dto.UpiDetailsRequest;
import com.shopplatform.shop.entity.Shop;
import com.shopplatform.shop.repository.ShopRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Shop creation wizard and owner-facing shop management: slug derivation/
 * uniqueness, logo upload, and bank payout details.
 */
@Service
public class ShopService {

    private static final Pattern NON_SLUG_CHARS = Pattern.compile("[^a-z0-9-]");
    private static final List<String> RESERVED_SLUGS = List.of("www", "api", "admin", "app", "static", "mail");

    private final ShopRepository shopRepository;
    private final ShopOwnerRepository shopOwnerRepository;
    private final S3Service s3Service;

    public ShopService(ShopRepository shopRepository, ShopOwnerRepository shopOwnerRepository, S3Service s3Service) {
        this.shopRepository = shopRepository;
        this.shopOwnerRepository = shopOwnerRepository;
        this.s3Service = s3Service;
    }

    @Transactional
    public Shop createShop(Long ownerId, CreateShopRequest request) {
        ShopOwner owner = shopOwnerRepository.findById(ownerId)
            .orElseThrow(() -> new ResourceNotFoundException("Owner not found"));

        String baseSlug = slugify(request.slug() != null && !request.slug().isBlank() ? request.slug() : request.name());
        String slug = ensureUniqueSlug(baseSlug);

        Shop shop = new Shop();
        shop.setName(request.name());
        shop.setSlug(slug);
        shop.setOwner(owner);
        return shopRepository.save(shop);
    }

    @Transactional
    public Shop uploadLogo(Long ownerId, Long shopId, MultipartFile logo) {
        Shop shop = getOwnedShop(ownerId, shopId);
        String url = s3Service.upload("shops/" + shop.getId() + "/logo", logo);
        shop.setLogoUrl(url);
        return shop;
    }

    @Transactional
    public Shop updateBankDetails(Long ownerId, Long shopId, BankDetailsRequest request) {
        Shop shop = getOwnedShop(ownerId, shopId);
        shop.setBankAccountName(request.accountHolderName());
        shop.setBankAccountNumber(request.accountNumber());
        shop.setBankIfscCode(request.ifscCode());
        return shop;
    }

    @Transactional
    public Shop updateContactDetails(Long ownerId, Long shopId, ContactDetailsRequest request) {
        Shop shop = getOwnedShop(ownerId, shopId);
        shop.setContactPhone(request.contactPhone());
        return shop;
    }

    @Transactional
    public Shop updateUpiDetails(Long ownerId, Long shopId, UpiDetailsRequest request) {
        Shop shop = getOwnedShop(ownerId, shopId);
        shop.setUpiId(request.upiId());
        return shop;
    }

    @Transactional(readOnly = true)
    public List<Shop> listShopsForOwner(Long ownerId) {
        return shopRepository.findAllByOwnerId(ownerId);
    }

    private Shop getOwnedShop(Long ownerId, Long shopId) {
        Shop shop = shopRepository.findById(shopId)
            .orElseThrow(() -> new ResourceNotFoundException("Shop not found"));
        if (!shop.getOwner().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Shop not found");
        }
        return shop;
    }

    private String slugify(String input) {
        String slug = input.toLowerCase().trim().replaceAll("\\s+", "-");
        slug = NON_SLUG_CHARS.matcher(slug).replaceAll("");
        slug = slug.replaceAll("-{2,}", "-").replaceAll("^-|-$", "");
        if (slug.isBlank()) {
            slug = "shop";
        }
        return slug;
    }

    private String ensureUniqueSlug(String baseSlug) {
        if (RESERVED_SLUGS.contains(baseSlug)) {
            baseSlug = baseSlug + "-shop";
        }
        if (!shopRepository.existsBySlug(baseSlug)) {
            return baseSlug;
        }
        for (int suffix = 2; suffix < 1000; suffix++) {
            String candidate = baseSlug + "-" + suffix;
            if (!shopRepository.existsBySlug(candidate)) {
                return candidate;
            }
        }
        throw new BusinessException("Could not generate a unique shop URL, please choose a different name");
    }
}
