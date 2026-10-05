package com.shopplatform.customer.service;

import com.shopplatform.common.exception.ResourceNotFoundException;
import com.shopplatform.customer.dto.CustomerAddressRequest;
import com.shopplatform.customer.dto.CustomerAddressResponse;
import com.shopplatform.customer.entity.Customer;
import com.shopplatform.customer.entity.CustomerAddress;
import com.shopplatform.customer.repository.CustomerAddressRepository;
import com.shopplatform.customer.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CustomerAddressService {

    private final CustomerAddressRepository addressRepository;
    private final CustomerRepository customerRepository;

    public CustomerAddressService(CustomerAddressRepository addressRepository, CustomerRepository customerRepository) {
        this.addressRepository = addressRepository;
        this.customerRepository = customerRepository;
    }

    public List<CustomerAddressResponse> list(Long customerId, Long shopId) {
        getOwnedCustomer(customerId, shopId);
        return addressRepository.findAllByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId).stream()
            .map(CustomerAddressResponse::from)
            .toList();
    }

    @Transactional
    public CustomerAddressResponse create(Long customerId, Long shopId, CustomerAddressRequest request) {
        Customer customer = getOwnedCustomer(customerId, shopId);
        List<CustomerAddress> existing = addressRepository.findAllByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId);

        CustomerAddress address = new CustomerAddress();
        address.setCustomer(customer);
        applyFields(address, request);
        // The very first address a customer saves becomes their default automatically.
        boolean shouldBeDefault = request.makeDefault() || existing.isEmpty();
        address.setDefault(shouldBeDefault);

        if (shouldBeDefault) {
            existing.forEach(a -> a.setDefault(false));
        }
        address = addressRepository.save(address);
        return CustomerAddressResponse.from(address);
    }

    @Transactional
    public CustomerAddressResponse update(Long customerId, Long shopId, Long addressId, CustomerAddressRequest request) {
        getOwnedCustomer(customerId, shopId);
        CustomerAddress address = getOwnedAddress(customerId, addressId);
        applyFields(address, request);
        if (request.makeDefault() && !address.isDefault()) {
            markAsDefault(customerId, address);
        }
        return CustomerAddressResponse.from(address);
    }

    @Transactional
    public void setDefault(Long customerId, Long shopId, Long addressId) {
        getOwnedCustomer(customerId, shopId);
        CustomerAddress address = getOwnedAddress(customerId, addressId);
        markAsDefault(customerId, address);
    }

    @Transactional
    public void delete(Long customerId, Long shopId, Long addressId) {
        getOwnedCustomer(customerId, shopId);
        CustomerAddress address = getOwnedAddress(customerId, addressId);
        boolean wasDefault = address.isDefault();
        addressRepository.delete(address);
        if (wasDefault) {
            addressRepository.findAllByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId).stream()
                .findFirst()
                .ifPresent(a -> a.setDefault(true));
        }
    }

    private void markAsDefault(Long customerId, CustomerAddress address) {
        addressRepository.findAllByCustomerIdOrderByIsDefaultDescCreatedAtDesc(customerId)
            .forEach(a -> a.setDefault(a.getId().equals(address.getId())));
    }

    private void applyFields(CustomerAddress address, CustomerAddressRequest request) {
        address.setLabel(request.label());
        address.setFullName(request.fullName());
        address.setPhone(request.phone());
        address.setAddressLine1(request.addressLine1());
        address.setAddressLine2(request.addressLine2());
        address.setCity(request.city());
        address.setState(request.state());
        address.setPincode(request.pincode());
    }

    private Customer getOwnedCustomer(Long customerId, Long shopId) {
        return customerRepository.findById(customerId)
            .filter(c -> c.getShop().getId().equals(shopId))
            .orElseThrow(() -> new ResourceNotFoundException("Customer not found"));
    }

    private CustomerAddress getOwnedAddress(Long customerId, Long addressId) {
        CustomerAddress address = addressRepository.findById(addressId)
            .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
        if (!address.getCustomer().getId().equals(customerId)) {
            throw new ResourceNotFoundException("Address not found");
        }
        return address;
    }
}
