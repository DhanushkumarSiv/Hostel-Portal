package com.project.hostel_management.controller;

import com.project.hostel_management.model.Student;
import com.project.hostel_management.service.FacultyService;
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

    @Autowired
    private FacultyService facultyService;

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

    @GetMapping("/floor/{floorNo}")
    public List<Student> getStudentsByFloor(@PathVariable String floorNo) {
        if (!securityUtil.hasAnyRole("ADMIN", "FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return studentService.getStudentsByFloorNo(floorNo);
    }

    @GetMapping("/floor/mine")
    public List<Student> getMyFloorStudents() {
        if (!securityUtil.hasAnyRole("FACULTY")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        String regNo = securityUtil.getCurrentRegNo();
        var faculty = facultyService.findFacultyByLoginId(regNo)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Faculty profile not found for login: " + regNo
                ));

        return facultyService.resolveAssignedFloor(faculty)
                .map(studentService::getStudentsByFloorNo)
                .orElseGet(studentService::getAllStudents);
    }

}
