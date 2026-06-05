package com.project.hostel_management.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "attendance.network")
public class AttendanceNetworkProperties {

    private boolean enabled = true;
    private List<String> allowedSubnets = new ArrayList<>(List.of("150.0.0.0-180.0.0.0"));
    private boolean allowLocalhost = true;
    private boolean trustProxyHeaders = true;
    private List<String> trustedProxySubnets = new ArrayList<>(List.of("127.0.0.1/32"));

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public List<String> getAllowedSubnets() {
        return allowedSubnets;
    }

    public void setAllowedSubnets(List<String> allowedSubnets) {
        this.allowedSubnets = allowedSubnets;
    }

    public boolean isAllowLocalhost() {
        return allowLocalhost;
    }

    public void setAllowLocalhost(boolean allowLocalhost) {
        this.allowLocalhost = allowLocalhost;
    }

    public boolean isTrustProxyHeaders() {
        return trustProxyHeaders;
    }

    public void setTrustProxyHeaders(boolean trustProxyHeaders) {
        this.trustProxyHeaders = trustProxyHeaders;
    }

    public List<String> getTrustedProxySubnets() {
        return trustedProxySubnets;
    }

    public void setTrustedProxySubnets(List<String> trustedProxySubnets) {
        this.trustedProxySubnets = trustedProxySubnets;
    }
}
