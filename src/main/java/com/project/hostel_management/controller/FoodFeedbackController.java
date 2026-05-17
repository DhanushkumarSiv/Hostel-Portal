package com.project.hostel_management.controller;

import com.project.hostel_management.model.FoodFeedback;
import com.project.hostel_management.service.FoodFeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/food_feedback")
@CrossOrigin("*")
public class FoodFeedbackController {

    @Autowired
    private FoodFeedbackService service;

    // POST - Submit new feedback
    @PostMapping("/submit")
    public FoodFeedback submitFeedback(@RequestParam int rating,
                                       @RequestParam String message,
                                       @RequestParam("image") MultipartFile image)
            throws IOException {
        return service.submitFeedback(rating, message, image);
    }

    // GET - Retrieve all feedback
    @GetMapping("/all")
    public List<FoodFeedback> getAllFeedback() {
        return service.getAllFeedback();
    }

}