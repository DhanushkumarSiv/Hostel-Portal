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

    public FoodFeedback submitFeedback(int rating, String message, MultipartFile image) {

        try{
            // 📁 Upload folder path
            String uploadDir = "uploads/feedback-images/";

            // 📄 Image file name
            String fileName = image.getOriginalFilename();

            // 📂 Full file path
            Path path = Paths.get(uploadDir + fileName);

            // 📁 Create folders if not exist
            Files.createDirectories(path.getParent());

            // 💾 Save image to folder
            Files.write(path, image.getBytes());

            // 🧾 Create feedback object
            FoodFeedback feedback = new FoodFeedback();

            feedback.setRating(rating);

            feedback.setMessage(message);

            // 🖼️ Save image name in DB
            feedback.setImageName(fileName);

            // 👨‍🎓 Temporary hardcoded student details
            // Later replace using JWT logged-in user
            feedback.setRegNo("24901013");

            feedback.setStudentName("Dhanush");

            // 💾 Save feedback to database
            return feedbackRepo.save(feedback);
        }

        catch (Exception e) {

            throw new RuntimeException(
                    "Failed to upload image: " + e.getMessage()
            );
        }
    }

    public List<FoodFeedback> getAllFeedback() {
        return feedbackRepo.findAll();
    }

}