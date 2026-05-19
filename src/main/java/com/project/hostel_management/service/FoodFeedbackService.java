package com.project.hostel_management.service;

import com.project.hostel_management.model.FoodFeedback;
import com.project.hostel_management.repository.FoodFeedbackRepository;
import com.project.hostel_management.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class FoodFeedbackService {

    @Autowired
    private FoodFeedbackRepository feedbackRepo;

    @Autowired
    private StudentRepository studentRepo;

    public FoodFeedback submitFeedback(int rating, String message, MultipartFile image, String regNo) {

        try {
            String uploadDir = "uploads/feedback-images/";
            String fileName = image.getOriginalFilename();

            Path path = Paths.get(uploadDir + fileName);
            Files.createDirectories(path.getParent());
            Files.write(path, image.getBytes());

            var student = studentRepo.findByRegNo(regNo)
                    .orElseThrow(() -> new RuntimeException("Student not found for regNo: " + regNo));

            FoodFeedback feedback = new FoodFeedback();
            feedback.setRating(rating);
            feedback.setMessage(message);
            feedback.setImageName(fileName);
            feedback.setRegNo(student.getRegNo());
            feedback.setStudentName(student.getName());

            return feedbackRepo.save(feedback);
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload image: " + e.getMessage());
        }
    }

    public List<FoodFeedback> getAllFeedback() {
        return feedbackRepo.findAll();
    }
}
