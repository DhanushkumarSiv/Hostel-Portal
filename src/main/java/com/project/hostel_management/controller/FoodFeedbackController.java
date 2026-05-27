package com.project.hostel_management.controller;

import com.project.hostel_management.dto.FoodFeedbackViewDto;
import com.project.hostel_management.model.FoodFeedback;
import com.project.hostel_management.service.SecurityUtil;
import com.project.hostel_management.service.FoodFeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/food_feedback")
@CrossOrigin("*")
public class FoodFeedbackController {

    @Autowired
    private FoodFeedbackService service;

    @Autowired
    private SecurityUtil securityUtil;

    // POST - Submit new feedback
    @PostMapping("/submit")
    public FoodFeedback submitFeedback(@RequestParam int rating,
                                       @RequestParam String message,
                                       @RequestParam(value = "image", required = false) MultipartFile image)
            throws IOException {
        if (!securityUtil.hasAnyRole("STUDENT")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return service.submitFeedback(rating, message, image, securityUtil.getCurrentRegNo());
    }

    // GET - Retrieve all feedback
    @GetMapping("/all")
    public List<FoodFeedbackViewDto> getAllFeedback() {
        if (!securityUtil.hasAnyRole("STUDENT", "FACULTY", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return service.getAllFeedbackForRole(securityUtil.getCurrentRole(), securityUtil.getCurrentRegNo());
    }

    @DeleteMapping("/{id}")
    public String deleteOwnFeedback(@PathVariable Long id) {
        if (!securityUtil.hasAnyRole("STUDENT")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        service.deleteStudentFeedback(id, securityUtil.getCurrentRegNo());
        return "Feedback deleted";
    }

}
