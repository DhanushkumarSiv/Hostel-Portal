package com.project.hostel_management.util;

import java.util.List;
import java.util.OptionalLong;

public final class IpAddressUtil {

    private static final long IPV4_MAX = 0xFFFFFFFFL;

    private IpAddressUtil() {
    }

    public static boolean isAllowedIpv4(String ipAddress, List<String> allowedRules) {
        if (ipAddress == null || allowedRules == null || allowedRules.isEmpty()) {
            return false;
        }

        String normalizedIp = normalizeAddress(ipAddress);
        OptionalLong parsedIp = parseIpv4ToLong(normalizedIp);
        if (parsedIp.isEmpty()) {
            return false;
        }

        return allowedRules.stream()
                .filter(rule -> rule != null && !rule.isBlank())
                .anyMatch(rule -> isIpAllowedByRule(parsedIp.getAsLong(), normalizedIp, rule.trim()));
    }

    public static boolean isLocalhost(String ipAddress) {
        String normalizedIp = normalizeAddress(ipAddress);
        if ("::1".equals(normalizedIp) || "0:0:0:0:0:0:0:1".equals(normalizedIp)) {
            return true;
        }

        OptionalLong parsedIp = parseIpv4ToLong(normalizedIp);
        if (parsedIp.isEmpty()) {
            return false;
        }

        return isInCidr(parsedIp.getAsLong(), "127.0.0.0/8");
    }

    public static boolean isValidIpv4(String ipAddress) {
        return parseIpv4ToLong(normalizeAddress(ipAddress)).isPresent();
    }

    public static String normalizeAddress(String ipAddress) {
        if (ipAddress == null) {
            return "";
        }

        String normalized = ipAddress.trim();
        if (normalized.startsWith("::ffff:")) {
            return normalized.substring("::ffff:".length());
        }
        return normalized;
    }

    private static boolean isIpAllowedByRule(long parsedIp, String normalizedIp, String rule) {
        if (rule.contains("-")) {
            String[] rangeParts = rule.split("-", 2);
            if (rangeParts.length != 2) {
                return false;
            }

            OptionalLong startIp = parseIpv4ToLong(rangeParts[0].trim());
            OptionalLong endIp = parseIpv4ToLong(rangeParts[1].trim());
            return startIp.isPresent()
                    && endIp.isPresent()
                    && parsedIp >= startIp.getAsLong()
                    && parsedIp <= endIp.getAsLong();
        }

        if (rule.contains("/")) {
            return isInCidr(parsedIp, rule);
        }

        return normalizedIp.equals(rule);
    }

    private static boolean isInCidr(long parsedIp, String cidr) {
        String[] cidrParts = cidr.split("/", 2);
        if (cidrParts.length != 2) {
            return false;
        }

        OptionalLong networkIp = parseIpv4ToLong(cidrParts[0].trim());
        if (networkIp.isEmpty()) {
            return false;
        }

        int prefixLength;
        try {
            prefixLength = Integer.parseInt(cidrParts[1].trim());
        } catch (NumberFormatException ex) {
            return false;
        }

        if (prefixLength < 0 || prefixLength > 32) {
            return false;
        }

        long mask = prefixLength == 0
                ? 0
                : (IPV4_MAX << (32 - prefixLength)) & IPV4_MAX;

        return (parsedIp & mask) == (networkIp.getAsLong() & mask);
    }

    private static OptionalLong parseIpv4ToLong(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return OptionalLong.empty();
        }

        String[] octets = ipAddress.trim().split("\\.");
        if (octets.length != 4) {
            return OptionalLong.empty();
        }

        long value = 0;
        for (String octetText : octets) {
            if (octetText.isBlank() || !octetText.matches("\\d{1,3}")) {
                return OptionalLong.empty();
            }

            int octet;
            try {
                octet = Integer.parseInt(octetText);
            } catch (NumberFormatException ex) {
                return OptionalLong.empty();
            }

            if (octet < 0 || octet > 255) {
                return OptionalLong.empty();
            }

            value = (value << 8) | octet;
        }

        return OptionalLong.of(value);
    }
}
