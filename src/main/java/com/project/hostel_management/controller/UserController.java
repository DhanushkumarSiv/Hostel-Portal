package com.project.hostel_management.controller;

import com.project.hostel_management.dto.LoginRequest;
import com.project.hostel_management.dto.LoginResponse;
import com.project.hostel_management.model.Users;
import com.project.hostel_management.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController {

    @Autowired
    private UserService service;


    @PostMapping("/register")
    public Users register(@RequestBody Users user) {
        return service.register(user);

    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {

        return service.verify(request);
    }
}
