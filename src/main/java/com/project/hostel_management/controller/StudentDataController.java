package com.project.hostel_management.controller;

import com.project.hostel_management.model.Student;
import com.project.hostel_management.service.SecurityUtil;
import com.project.hostel_management.service.StudentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/students")
@CrossOrigin("*")
public class StudentDataController {

    @Autowired
    private StudentService studentService;

    @Autowired
    private SecurityUtil securityUtil;

    // GET all students (FROM DATABASE)
    @GetMapping
    public List<Student> getAllStudents() {
        if (!securityUtil.hasAnyRole("ADMIN", "FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return studentService.getAllStudents();
    }

    // GET student by ID
    @GetMapping("/{id}")
    public Student getStudent(@PathVariable Long id) {
        if (!securityUtil.hasAnyRole("ADMIN", "FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return studentService.getStudentById(id);
    }

    @GetMapping("/me")
    public Student getLoggedInStudent() {
        String regNo = securityUtil.getCurrentRegNo();
        return studentService.getStudentByRegNo(regNo)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Student not found for regNo: " + regNo
                ));
    }

    @GetMapping("/reg/{regNo}")
    public Student getStudentByRegNo(@PathVariable String regNo) {
        if (!securityUtil.hasAnyRole("ADMIN", "FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return studentService.getStudentByRegNo(regNo)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Student not found for regNo: " + regNo
                ));
    }

}
