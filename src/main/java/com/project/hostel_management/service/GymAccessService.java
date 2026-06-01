package com.project.hostel_management.service;

import com.project.hostel_management.model.GymAccess;
import com.project.hostel_management.repository.GymAccessRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GymAccessService {

    public static final String GYM_QR_KEY = "GYM KEY";

    @Autowired
    private GymAccessRepository repository;

    @Autowired
    private QrCodeService qrCodeService;

    public String scanGymQR(String role,
                            String studentId,
                            String studentName,
                            String roomNo,
                            String mobileNo,
                            String qrData) {
        validateGymQr(qrData);

        Optional<GymAccess> activeEntry =
                repository.findByStudentIdAndStatus(studentId, "ACTIVE");

        if (activeEntry.isPresent()) {
            GymAccess access = activeEntry.get();
            access.setCloseTime(LocalDateTime.now());
            access.setStatus("RETURNED");
            repository.save(access);
            return "Gym key returned successfully";
        }

        List<GymAccess> activeKeys = repository.findAllByStatus("ACTIVE");
        if (!activeKeys.isEmpty()) {
            GymAccess activeKey = activeKeys.get(0);
            return "Gym key is already taken by " + safe(activeKey.getStudentName());
        }

        GymAccess access = new GymAccess();
        access.setStudentId(studentId);
        access.setStudentName(studentName);
        access.setKeyHolderRole(role);
        access.setRoomNo(roomNo);
        access.setMobileNo(mobileNo);
        access.setOpenTime(LocalDateTime.now());
        access.setStatus("ACTIVE");

        repository.save(access);
        return "Gym key taken successfully";
    }

    public Map<String, String> getPermanentQr() {
        return Map.of(
                "qrData", GYM_QR_KEY,
                "qrImageDataUrl", qrCodeService.buildQrImageDataUrl(GYM_QR_KEY),
                "label", "Permanent Gym QR"
        );
    }

    public Map<String, Object> getGymStatusDetails() {
        List<GymAccess> active = repository.findAllByStatus("ACTIVE");
        List<GymAccess> logs = repository.findAllByOrderByOpenTimeDesc();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", active.isEmpty() ? "Gym key is available / returned" : "Gym key is taken");
        response.put("activeCount", active.size());
        response.put("activeHolder", active.isEmpty() ? null : active.get(0));
        response.put("logs", logs);
        return response;
    }

    public List<String> getOverdueAlertsForAdmin() {
        LocalDateTime threshold = LocalDateTime.now().minusHours(4);
        return repository.findByStatusAndOpenTimeBefore("ACTIVE", threshold).stream()
                .map(this::buildAlertMessage)
                .collect(Collectors.toList());
    }

    public List<String> getOverdueAlertsForUser(String regNo) {
        LocalDateTime threshold = LocalDateTime.now().minusHours(4);
        return repository.findByStatusAndOpenTimeBefore("ACTIVE", threshold).stream()
                .filter(entry -> entry.getStudentId() != null && entry.getStudentId().equalsIgnoreCase(regNo))
                .map(this::buildAlertMessage)
                .collect(Collectors.toList());
    }

    private String buildAlertMessage(GymAccess entry) {
        return "Gym key alert: " + safe(entry.getStudentName()) + " (" + safe(entry.getKeyHolderRole())
                + ") has not returned key within 4 hours.";
    }

    private void validateGymQr(String qrData) {
        if (qrData == null || !GYM_QR_KEY.equalsIgnoreCase(qrData.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Gym QR");
        }
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
