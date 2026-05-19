package com.project.hostel_management.repository;

import com.project.hostel_management.model.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepo extends JpaRepository<Users, Integer> {

    Optional<Users> findByRegNo(String regNo);

    Optional<Users> findByRegNoAndRoleIgnoreCase(String regNo, String role);
}
