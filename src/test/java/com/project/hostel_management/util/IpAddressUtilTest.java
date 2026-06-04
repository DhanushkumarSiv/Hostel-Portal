package com.project.hostel_management.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IpAddressUtilTest {

    @Test
    void allowsIpv4InsideConfiguredRange() {
        List<String> allowedRules = List.of("152.57.0.0-152.57.255.255");

        assertTrue(IpAddressUtil.isAllowedIpv4("152.57.0.0", allowedRules));
        assertTrue(IpAddressUtil.isAllowedIpv4("152.57.83.236", allowedRules));
        assertTrue(IpAddressUtil.isAllowedIpv4("152.57.255.255", allowedRules));
    }

    @Test
    void rejectsIpv4OutsideConfiguredRange() {
        List<String> allowedRules = List.of("152.57.0.0-152.57.255.255");

        assertFalse(IpAddressUtil.isAllowedIpv4("152.56.255.255", allowedRules));
        assertFalse(IpAddressUtil.isAllowedIpv4("152.58.0.0", allowedRules));
    }

    @Test
    void supportsCidrRules() {
        List<String> allowedRules = List.of("10.197.210.0/24");

        assertTrue(IpAddressUtil.isAllowedIpv4("10.197.210.25", allowedRules));
        assertFalse(IpAddressUtil.isAllowedIpv4("10.197.211.25", allowedRules));
    }

    @Test
    void rejectsInvalidIpv4Values() {
        assertFalse(IpAddressUtil.isValidIpv4("10.197.210.999"));
        assertFalse(IpAddressUtil.isValidIpv4("2001:db8::1"));
    }
}
