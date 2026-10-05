package com.shopplatform.customer.controller;

import com.shopplatform.customer.dto.CustomerAddressRequest;
import com.shopplatform.customer.dto.CustomerAddressResponse;
import com.shopplatform.customer.security.CustomerPrincipal;
import com.shopplatform.customer.security.CustomerTenantGuard;
import com.shopplatform.customer.service.CustomerAddressService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me/addresses")
public class CustomerAddressController {

    private final CustomerAddressService addressService;
    private final CustomerTenantGuard customerTenantGuard;

    public CustomerAddressController(CustomerAddressService addressService, CustomerTenantGuard customerTenantGuard) {
        this.addressService = addressService;
        this.customerTenantGuard = customerTenantGuard;
    }

    @GetMapping
    public List<CustomerAddressResponse> list(@AuthenticationPrincipal CustomerPrincipal principal) {
        customerTenantGuard.verify(principal);
        return addressService.list(principal.customerId(), principal.shopId());
    }

    @PostMapping
    public ResponseEntity<CustomerAddressResponse> create(@AuthenticationPrincipal CustomerPrincipal principal,
                                                           @Valid @RequestBody CustomerAddressRequest request) {
        customerTenantGuard.verify(principal);
        return ResponseEntity.ok(addressService.create(principal.customerId(), principal.shopId(), request));
    }

    @PutMapping("/{addressId}")
    public ResponseEntity<CustomerAddressResponse> update(@AuthenticationPrincipal CustomerPrincipal principal,
                                                           @PathVariable Long addressId,
                                                           @Valid @RequestBody CustomerAddressRequest request) {
        customerTenantGuard.verify(principal);
        return ResponseEntity.ok(addressService.update(principal.customerId(), principal.shopId(), addressId, request));
    }

    @PutMapping("/{addressId}/default")
    public ResponseEntity<Void> setDefault(@AuthenticationPrincipal CustomerPrincipal principal, @PathVariable Long addressId) {
        customerTenantGuard.verify(principal);
        addressService.setDefault(principal.customerId(), principal.shopId(), addressId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal CustomerPrincipal principal, @PathVariable Long addressId) {
        customerTenantGuard.verify(principal);
        addressService.delete(principal.customerId(), principal.shopId(), addressId);
        return ResponseEntity.noContent().build();
    }
}
