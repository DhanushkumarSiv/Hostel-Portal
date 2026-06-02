package com.project.hostel_management.service;

import com.project.hostel_management.config.AttendanceNetworkProperties;
import com.project.hostel_management.exception.UnauthorizedNetworkAccessException;
import com.project.hostel_management.util.IpAddressUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AttendanceNetworkAccessService {

    private static final String NETWORK_DENIED_MESSAGE = "Attendance can only be marked from the hostel network.";

    private final AttendanceNetworkProperties properties;

    public AttendanceNetworkAccessService(AttendanceNetworkProperties properties) {
        this.properties = properties;
    }

    public void validateAttendanceMarkingAccess(HttpServletRequest request) {
        if (!properties.isEnabled()) {
            return;
        }

        String clientIp = resolveClientIp(request);
        if (properties.isAllowLocalhost() && IpAddressUtil.isLocalhost(clientIp)) {
            return;
        }

        if (IpAddressUtil.isAllowedIpv4(clientIp, properties.getAllowedSubnets())) {
            return;
        }

        throw new UnauthorizedNetworkAccessException(NETWORK_DENIED_MESSAGE);
    }

    public String resolveClientIp(HttpServletRequest request) {
        String remoteAddress = IpAddressUtil.normalizeAddress(request.getRemoteAddr());
        if (!properties.isTrustProxyHeaders() || !isTrustedProxy(remoteAddress)) {
            return remoteAddress;
        }

        return firstForwardedAddress(request)
                .orElse(remoteAddress);
    }

    private boolean isTrustedProxy(String remoteAddress) {
        if (IpAddressUtil.isLocalhost(remoteAddress)) {
            return true;
        }

        List<String> trustedProxySubnets = properties.getTrustedProxySubnets();
        return IpAddressUtil.isAllowedIpv4(remoteAddress, trustedProxySubnets);
    }

    private Optional<String> firstForwardedAddress(HttpServletRequest request) {
        Optional<String> xForwardedFor = firstValidAddressFromXForwardedFor(request.getHeader("X-Forwarded-For"));
        if (xForwardedFor.isPresent()) {
            return xForwardedFor;
        }

        Optional<String> forwarded = firstValidAddressFromForwardedHeader(request.getHeader("Forwarded"));
        if (forwarded.isPresent()) {
            return forwarded;
        }

        return validForwardedAddress(request.getHeader("X-Real-IP"));
    }

    private Optional<String> firstValidAddressFromXForwardedFor(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) {
            return Optional.empty();
        }

        String[] candidates = headerValue.split(",");
        for (String candidate : candidates) {
            Optional<String> address = validForwardedAddress(candidate);
            if (address.isPresent()) {
                return address;
            }
        }

        return Optional.empty();
    }

    private Optional<String> firstValidAddressFromForwardedHeader(String headerValue) {
        if (headerValue == null || headerValue.isBlank()) {
            return Optional.empty();
        }

        String[] forwardedParts = headerValue.split("[;,]");
        for (String forwardedPart : forwardedParts) {
            String[] keyValue = forwardedPart.trim().split("=", 2);
            if (keyValue.length == 2 && "for".equalsIgnoreCase(keyValue[0].trim())) {
                Optional<String> address = validForwardedAddress(keyValue[1]);
                if (address.isPresent()) {
                    return address;
                }
            }
        }

        return Optional.empty();
    }

    private Optional<String> validForwardedAddress(String value) {
        String address = cleanForwardedAddress(value);
        if (IpAddressUtil.isValidIpv4(address) || IpAddressUtil.isLocalhost(address)) {
            return Optional.of(address);
        }

        return Optional.empty();
    }

    private String cleanForwardedAddress(String value) {
        if (value == null) {
            return "";
        }

        String cleaned = value.trim()
                .replace("\"", "")
                .replace("[", "")
                .replace("]", "");

        int portSeparatorIndex = cleaned.lastIndexOf(':');
        if (portSeparatorIndex > -1 && cleaned.indexOf(':') == portSeparatorIndex) {
            cleaned = cleaned.substring(0, portSeparatorIndex);
        }

        return IpAddressUtil.normalizeAddress(cleaned);
    }
}
