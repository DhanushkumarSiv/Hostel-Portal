package com.project.hostel_management.exception;

public class UnauthorizedNetworkAccessException extends RuntimeException {

    private final String clientIp;

    public UnauthorizedNetworkAccessException(String message, String clientIp) {
        super(message);
        this.clientIp = clientIp;
    }

    public String getClientIp() {
        return clientIp;
    }
}
