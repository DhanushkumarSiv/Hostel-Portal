package com.project.hostel_management.service;

import com.project.hostel_management.dto.LoginRequest;
import com.project.hostel_management.dto.LoginResponse;
import com.project.hostel_management.model.Student;
import com.project.hostel_management.model.Users;
import com.project.hostel_management.repository.StudentRepository;
import com.project.hostel_management.repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class UserService {

    @Autowired
    private JWTService jwtService;

    @Autowired
    AuthenticationManager authManager;

    @Autowired
    private UserRepo repo;

    @Autowired
    private StudentRepository studentRepository;


    private BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public Users register(Users user) {
        user.setRole(normalizeRole(user.getRole()));
        user.setPassword(encoder.encode(user.getPassword()));
        repo.save(user);
        return user;
    }

    public LoginResponse verify(LoginRequest loginRequest) {
        Authentication authentication;
        try {
            authentication = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getRegNo(),
                            loginRequest.getPassword()
                    )
            );
        } catch (AuthenticationException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        if (!authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        Users user = repo.findByRegNo(loginRequest.getRegNo())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        String storedRole = normalizeRole(user.getRole());
        String requestedRole = normalizeRole(loginRequest.getRole());

        if (loginRequest.getRole() != null && !loginRequest.getRole().isBlank() && !storedRole.equals(requestedRole)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "This account is registered as " + storedRole + ". Please select that role.");
        }

        String token = jwtService.generateToken(user.getRegNo(), storedRole);

        Student student = null;
        if ("STUDENT".equals(storedRole)) {
            student = studentRepository.findByRegNo(user.getRegNo()).orElse(null);
        }

        return new LoginResponse(token, user.getRegNo(), storedRole, student);
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return "STUDENT";
        }

        String normalized = role.trim().toUpperCase(Locale.ROOT);
        while (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }

        return normalized.isBlank() ? "STUDENT" : normalized;
    }
}
