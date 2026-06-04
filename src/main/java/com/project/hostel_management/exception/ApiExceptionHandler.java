package com.project.hostel_management.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(UnauthorizedNetworkAccessException.class)
    public ResponseEntity<Map<String, Object>> handleUnauthorizedNetworkAccess(
            UnauthorizedNetworkAccessException exception
    ) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", false);
        response.put("message", exception.getMessage());
        response.put("clientIp", exception.getClientIp());

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }
}
