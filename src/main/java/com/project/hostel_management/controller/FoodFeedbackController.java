package com.project.hostel_management.controller;

import com.project.hostel_management.dto.FoodFeedbackViewDto;
import com.project.hostel_management.model.FoodFeedback;
import com.project.hostel_management.service.SecurityUtil;
import com.project.hostel_management.service.FoodFeedbackService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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

    @GetMapping("/image/{fileName:.+}")
    public ResponseEntity<Resource> getFeedbackImage(@PathVariable String fileName) {
        try {
            Path uploadDir = Paths.get("uploads", "feedback-images").toAbsolutePath().normalize();
            Path imagePath = uploadDir.resolve(fileName).normalize();

            if (!imagePath.startsWith(uploadDir)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image path");
            }

            if (!Files.exists(imagePath)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
            }

            Resource resource = new UrlResource(imagePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found");
            }

            String contentType = Files.probeContentType(imagePath);
            MediaType mediaType = (contentType == null || contentType.isBlank())
                    ? MediaType.APPLICATION_OCTET_STREAM
                    : MediaType.parseMediaType(contentType);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .body(resource);
        } catch (ResponseStatusException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to load image");
        }
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
