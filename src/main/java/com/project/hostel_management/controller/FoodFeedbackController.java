package com.project.hostel_management.controller;

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
                                       @RequestParam("image") MultipartFile image)
            throws IOException {
        if (!securityUtil.hasAnyRole("STUDENT", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return service.submitFeedback(rating, message, image, securityUtil.getCurrentRegNo());
    }

    // GET - Retrieve all feedback
    @GetMapping("/all")
    public List<FoodFeedback> getAllFeedback() {
        if (!securityUtil.hasAnyRole("FACULTY", "ADMIN")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }
        return service.getAllFeedback();
    }

}
