package com.project.hostel_management.service;

import com.project.hostel_management.model.UserPrincipal;
import com.project.hostel_management.model.Users;
import com.project.hostel_management.repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class MyUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepo userRepo;


    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Users user = userRepo.findByRegNo(username)
                .orElseThrow(() -> new UsernameNotFoundException("user not found"));

        return new UserPrincipal(user);
    }
}
