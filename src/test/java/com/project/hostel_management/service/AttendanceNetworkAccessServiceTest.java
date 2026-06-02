package com.project.hostel_management.service;

import com.project.hostel_management.config.AttendanceNetworkProperties;
import com.project.hostel_management.exception.UnauthorizedNetworkAccessException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AttendanceNetworkAccessServiceTest {

    @Test
    void allowsHostelNetworkIp() {
        AttendanceNetworkAccessService service = serviceWithDefaults();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.197.210.45");

        assertDoesNotThrow(() -> service.validateAttendanceMarkingAccess(request));
    }

    @Test
    void deniesOutsideNetworkIp() {
        AttendanceNetworkAccessService service = serviceWithDefaults();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.45");

        UnauthorizedNetworkAccessException exception = assertThrows(
                UnauthorizedNetworkAccessException.class,
                () -> service.validateAttendanceMarkingAccess(request)
        );

        assertEquals("Attendance can only be marked from the hostel network.", exception.getMessage());
    }

    @Test
    void usesXForwardedForFromTrustedProxy() {
        AttendanceNetworkAccessService service = serviceWithDefaults();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        request.addHeader("X-Forwarded-For", "10.197.210.77, 127.0.0.1");

        assertEquals("10.197.210.77", service.resolveClientIp(request));
        assertDoesNotThrow(() -> service.validateAttendanceMarkingAccess(request));
    }

    @Test
    void ignoresForwardedHeadersFromUntrustedRemoteAddress() {
        AttendanceNetworkAccessService service = serviceWithDefaults();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.45");
        request.addHeader("X-Forwarded-For", "10.197.210.77");

        assertEquals("192.168.1.45", service.resolveClientIp(request));
        assertThrows(
                UnauthorizedNetworkAccessException.class,
                () -> service.validateAttendanceMarkingAccess(request)
        );
    }

    private AttendanceNetworkAccessService serviceWithDefaults() {
        AttendanceNetworkProperties properties = new AttendanceNetworkProperties();
        properties.setAllowedSubnets(List.of("10.197.210.1-10.197.210.254"));
        properties.setTrustedProxySubnets(List.of("127.0.0.1/32"));
        properties.setAllowLocalhost(true);
        properties.setTrustProxyHeaders(true);

        return new AttendanceNetworkAccessService(properties);
    }
}
