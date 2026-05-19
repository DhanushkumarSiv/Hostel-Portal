package com.project.hostel_management.service;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class SecurityUtil {

    public String getCurrentRegNo() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? null : authentication.getName();
    }

    public String getCurrentRole() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getAuthorities().isEmpty()) {
            return null;
        }
        GrantedAuthority authority = authentication.getAuthorities().iterator().next();
        return authority.getAuthority().replace("ROLE_", "").toUpperCase(Locale.ROOT);
    }

    public boolean hasAnyRole(String... roles) {
        String currentRole = getCurrentRole();
        if (currentRole == null) {
            return false;
        }
        for (String role : roles) {
            if (currentRole.equalsIgnoreCase(role)) {
                return true;
            }
        }
        return false;
    }
}
