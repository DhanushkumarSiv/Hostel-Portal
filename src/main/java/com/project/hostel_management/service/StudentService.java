package com.project.hostel_management.service;

import com.project.hostel_management.model.Student;
import com.project.hostel_management.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class StudentService {

    @Autowired
    private StudentRepository studentRepository;

    // 🔹 Fetch all students from PostgreSQL
    public List<Student> getAllStudents() {
        return studentRepository.findAll();
    }

    // 🔹 Fetch student by ID
    public Student getStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Student not found"));
    }


}