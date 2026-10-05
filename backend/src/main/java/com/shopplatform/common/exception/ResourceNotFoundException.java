package com.shopplatform.common.exception;

/** Thrown when a requested entity does not exist (or is not visible to the caller); mapped to HTTP 404. */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
