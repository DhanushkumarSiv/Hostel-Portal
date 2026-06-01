package com.project.hostel_management.service;

import com.project.hostel_management.model.IndoorCourt;
import com.project.hostel_management.repository.IndoorCourtRepository;
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
public class IndoorCourtService {

    public static final String INDOOR_QR_KEY = "INDOOR KEY";

    @Autowired
    private IndoorCourtRepository repository;

    @Autowired
    private QrCodeService qrCodeService;

    public String scanIndoorCourtQR(String role,
                                    String studentId,
                                    String studentName,
                                    String roomNo,
                                    String mobileNo,
                                    String qrData) {
        validateIndoorQr(qrData);

        Optional<IndoorCourt> activeEntry =
                repository.findByStudentIdAndStatus(studentId, "ACTIVE");

        if (activeEntry.isPresent()) {
            IndoorCourt access = activeEntry.get();
            access.setCloseTime(LocalDateTime.now());
            access.setStatus("RETURNED");
            repository.save(access);
            return "Indoor court key returned successfully";
        }

        List<IndoorCourt> activeKeys = repository.findAllByStatus("ACTIVE");
        if (!activeKeys.isEmpty()) {
            IndoorCourt activeKey = activeKeys.get(0);
            return "Indoor court key is already taken by " + safe(activeKey.getStudentName());
        }

        IndoorCourt access = new IndoorCourt();
        access.setStudentId(studentId);
        access.setStudentName(studentName);
        access.setKeyHolderRole(role);
        access.setRoomNo(roomNo);
        access.setMobileNo(mobileNo);
        access.setOpenTime(LocalDateTime.now());
        access.setStatus("ACTIVE");

        repository.save(access);
        return "Indoor court key taken successfully";
    }

    public Map<String, String> getPermanentQr() {
        return Map.of(
                "qrData", INDOOR_QR_KEY,
                "qrImageDataUrl", qrCodeService.buildQrImageDataUrl(INDOOR_QR_KEY),
                "label", "Permanent Indoor Court QR"
        );
    }

    public Map<String, Object> getIndoorCourtStatusDetails() {
        List<IndoorCourt> active = repository.findAllByStatus("ACTIVE");
        List<IndoorCourt> logs = repository.findAllByOrderByOpenTimeDesc();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", active.isEmpty() ? "Indoor court key is available / returned" : "Indoor court key is taken");
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

    private String buildAlertMessage(IndoorCourt entry) {
        return "Indoor court key alert: " + safe(entry.getStudentName()) + " (" + safe(entry.getKeyHolderRole())
                + ") has not returned key within 4 hours.";
    }

    private void validateIndoorQr(String qrData) {
        if (qrData == null || !INDOOR_QR_KEY.equalsIgnoreCase(qrData.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Indoor Court QR");
        }
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
