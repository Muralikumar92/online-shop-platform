package com.shopplatform.customer.dto;

import com.shopplatform.customer.entity.CustomerAddress;

public record CustomerAddressResponse(
    Long id,
    String label,
    String fullName,
    String phone,
    String addressLine1,
    String addressLine2,
    String city,
    String state,
    String pincode,
    boolean isDefault
) {
    public static CustomerAddressResponse from(CustomerAddress address) {
        return new CustomerAddressResponse(
            address.getId(), address.getLabel(), address.getFullName(), address.getPhone(),
            address.getAddressLine1(), address.getAddressLine2(), address.getCity(),
            address.getState(), address.getPincode(), address.isDefault()
        );
    }
}
