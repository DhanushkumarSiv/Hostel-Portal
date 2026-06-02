package com.project.hostel_management.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class IpAddressUtilTest {

    @Test
    void allowsIpv4InsideConfiguredRange() {
        List<String> allowedRules = List.of("10.197.210.1-10.197.210.254");

        assertTrue(IpAddressUtil.isAllowedIpv4("10.197.210.1", allowedRules));
        assertTrue(IpAddressUtil.isAllowedIpv4("10.197.210.254", allowedRules));
    }

    @Test
    void rejectsIpv4OutsideConfiguredRange() {
        List<String> allowedRules = List.of("10.197.210.1-10.197.210.254");

        assertFalse(IpAddressUtil.isAllowedIpv4("10.197.209.44", allowedRules));
        assertFalse(IpAddressUtil.isAllowedIpv4("10.197.210.255", allowedRules));
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
