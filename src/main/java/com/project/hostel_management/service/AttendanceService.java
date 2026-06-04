package com.project.hostel_management.service;

import com.project.hostel_management.dto.AttendanceForumDto;
import com.project.hostel_management.dto.AttendanceForumMessageDto;
import com.project.hostel_management.dto.AttendanceRowDto;
import com.project.hostel_management.dto.AttendanceQrSessionDto;
import com.project.hostel_management.dto.AttendanceSummaryDto;
import com.project.hostel_management.model.Attendance;
import com.project.hostel_management.model.AttendanceForumMessage;
import com.project.hostel_management.model.AttendanceQrSession;
import com.project.hostel_management.model.Faculty;
import com.project.hostel_management.model.Student;
import com.project.hostel_management.repository.AttendanceForumMessageRepository;
import com.project.hostel_management.repository.AttendanceQrSessionRepository;
import com.project.hostel_management.repository.AttendanceRepository;
import com.project.hostel_management.repository.StudentRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.NotFoundException;
import com.google.zxing.Result;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.awt.image.BufferedImage;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Base64;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AttendanceService {
    private static final long ATTENDANCE_QR_VALIDITY_MINUTES = 60L;

    @Autowired
    private AttendanceRepository repository;

    @Autowired
    private StudentRepository studentRepository;

    @Autowired
    private AttendanceQrSessionRepository qrSessionRepository;

    @Autowired
    private AttendanceForumMessageRepository forumMessageRepository;

    @Autowired
    private FacultyService facultyService;

    // Generate QR text for student
    @Transactional
    public Map<String, String> generateQR(String generatedBy) {
        Faculty faculty = facultyService.findFacultyByLoginId(generatedBy)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Faculty profile not found"));

        String floorNo = resolveFacultyFloor(faculty)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faculty floor not assigned"));

        LocalDate today = LocalDate.now();

        String sessionId = String.valueOf(System.currentTimeMillis());

        String qrData = "ATTENDANCE|" + today + "|" + sessionId;
        String qrImageDataUrl = buildQrImageDataUrl(qrData);

        List<AttendanceQrSession> activeSessions =
                qrSessionRepository.findByFloorNoIgnoreCaseAndAttendanceDateAndActiveTrue(floorNo, today);
        activeSessions.forEach(session -> session.setActive(false));
        qrSessionRepository.saveAll(activeSessions);

        AttendanceQrSession qrSession = new AttendanceQrSession();
        qrSession.setSessionId(sessionId);
        qrSession.setFloorNo(floorNo);
        qrSession.setFacultyId(generatedBy);
        qrSession.setFacultyName(defaultString(faculty.getName(), "Floor Faculty"));
        qrSession.setQrData(qrData);
        qrSession.setQrImageDataUrl(qrImageDataUrl);
        qrSession.setAttendanceDate(today);
        qrSessionRepository.save(qrSession);

        return Map.of(
                "qrData", qrData,
                "qrImageDataUrl", qrImageDataUrl,
                "generatedBy", generatedBy,
                "generatedByName", defaultString(faculty.getName(), "Floor Faculty"),
                "floorNo", floorNo
        );
    }

    private String buildQrImageDataUrl(String qrData) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(qrData, BarcodeFormat.QR_CODE, 280, 280);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

            String base64 = Base64.getEncoder().encodeToString(outputStream.toByteArray());
            return "data:image/png;base64," + base64;
        } catch (WriterException | java.io.IOException e) {
            throw new IllegalStateException("Failed to generate attendance QR", e);
        }
    }

    public String decodeQrFromImageData(String imageData) {
        if (imageData == null || imageData.isBlank()) {
            return null;
        }

        try {
            String base64Part = imageData.contains(",")
                    ? imageData.substring(imageData.indexOf(',') + 1)
                    : imageData;

            byte[] imageBytes = Base64.getDecoder().decode(base64Part);
            BufferedImage bufferedImage = ImageIO.read(new ByteArrayInputStream(imageBytes));

            if (bufferedImage == null) {
                return null;
            }

            BinaryBitmap bitmap = new BinaryBitmap(
                    new HybridBinarizer(new BufferedImageLuminanceSource(bufferedImage))
            );

            Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
            hints.put(DecodeHintType.POSSIBLE_FORMATS, List.of(BarcodeFormat.QR_CODE));
            hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);

            Result result = new MultiFormatReader().decode(bitmap, hints);
            return result.getText();
        } catch (NotFoundException e) {
            return null;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decode attendance QR image", e);
        }
    }

    // Mark Attendance
    public String markAttendance(
            String qrData,
            String loggedInStudentId,
            String studentName,
            String roomNumber,
            String studentFloorNo
    ) {

        try {

            // Split QR Data
            String[] parts = qrData.split("\\|");

            if (parts.length < 3 || !"ATTENDANCE".equals(parts[0])) {
                return "Invalid Student QR";
            }
            String qrDate = parts[1];
            String sessionId = parts[2];

            // Validate Date
            if(!qrDate.equals(LocalDate.now().toString())) {
                return "Expired QR";
            }

            AttendanceQrSession qrSession = qrSessionRepository
                    .findFirstBySessionIdAndAttendanceDateAndActiveTrue(sessionId, LocalDate.now())
                    .orElse(null);

            if (qrSession == null) {
                return "Invalid or Expired QR Session";
            }

            if (isAttendanceQrExpired(qrSession)) {
                deactivateAttendanceQrSession(qrSession);
                return "Expired QR";
            }

            if (!sameFloor(qrSession.getFloorNo(), studentFloorNo)) {
                return "Use QR Generated For Your Floor";
            }

            // Check Duplicate Attendance
            boolean alreadyMarked =
                    repository.existsByStudentIdAndAttendanceDate(
                            loggedInStudentId,
                            LocalDate.now()
                    );

            if(alreadyMarked) {
                return "Attendance Already Marked";
            }

            // Time Validation
            LocalTime now = LocalTime.now();

            Attendance attendance = new Attendance();

            attendance.setStudentId(loggedInStudentId);
            attendance.setStudentName(studentName);
            attendance.setRoomNumber(roomNumber);

            attendance.setAttendanceDate(LocalDate.now());

            attendance.setMarkedTime(LocalDateTime.now());

            // PRESENT or LATE
            if(now.isAfter(LocalTime.of(21,0))) {
                attendance.setStatus(Attendance.Status.LATE);
            } else {
                attendance.setStatus(Attendance.Status.PRESENT);
            }

            repository.save(attendance);

            return "Attendance Marked Successfully";

        } catch (Exception e) {

            return "Invalid QR";
        }
    }

    public AttendanceSummaryDto getAdminTodaySummary() {
        List<Student> students = studentRepository.findAll();
        return buildSummary("ALL_HOSTEL", students, Optional.empty());
    }

    public AttendanceSummaryDto getFacultyTodaySummary(String facultyLoginId) {
        Optional<String> floorNo = facultyService.findFacultyByLoginId(facultyLoginId)
                .flatMap(facultyService::resolveAssignedFloor);
        List<Student> students = floorNo
                .map(studentRepository::findByFloorNoIgnoreCaseOrderByNameAsc)
                .orElseGet(studentRepository::findAll);

        return buildSummary("FACULTY_SCOPE", students, floorNo);
    }

    @Transactional
    public AttendanceSummaryDto manuallyMarkAttendance(String facultyLoginId, String studentId, String requestedStatus) {
        String normalizedStatus = normalize(requestedStatus)
                .map(value -> value.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Attendance status is required"));

        if (!"PRESENT".equals(normalizedStatus) && !"ABSENT".equals(normalizedStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be PRESENT or ABSENT");
        }

        Faculty faculty = facultyService.findFacultyByLoginId(facultyLoginId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Faculty profile not found"));
        String facultyFloorNo = resolveFacultyFloor(faculty)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faculty floor not assigned"));

        String cleanStudentId = normalize(studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student register number is required"));
        Student student = studentRepository.findByRegNo(cleanStudentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));

        if (!sameFloor(facultyFloorNo, student.getFloorNo())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Faculty can mark attendance only for assigned floor students");
        }

        LocalDate today = LocalDate.now();
        Attendance attendance = repository
                .findFirstByStudentIdIgnoreCaseAndAttendanceDate(student.getRegNo(), today)
                .orElseGet(Attendance::new);

        attendance.setStudentId(student.getRegNo());
        attendance.setStudentName(student.getName());
        attendance.setRoomNumber(student.getRoomNo());
        attendance.setAttendanceDate(today);
        attendance.setMarkedTime(LocalDateTime.now());
        attendance.setStatus(Attendance.Status.valueOf(normalizedStatus));
        repository.save(attendance);

        return getFacultyTodaySummary(facultyLoginId);
    }

    public AttendanceForumDto getForum(String role, String loginId) {
        ForumParticipant participant = resolveForumParticipant(role, loginId);
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();

        AttendanceQrSessionDto latestQr = qrSessionRepository
                .findFirstByFloorNoIgnoreCaseAndAttendanceDateAndActiveTrueOrderByCreatedAtDesc(
                        participant.floorNo(),
                        today
                )
                .filter(session -> {
                    if (isAttendanceQrExpired(session)) {
                        deactivateAttendanceQrSession(session);
                        return false;
                    }
                    return true;
                })
                .map(this::toQrDto)
                .orElse(null);

        List<AttendanceForumMessageDto> messages = forumMessageRepository
                .findByFloorNoIgnoreCaseAndCreatedAtAfterOrderByCreatedAtAsc(
                        participant.floorNo(),
                        todayStart
                )
                .stream()
                .map(this::toMessageDto)
                .collect(Collectors.toList());

        return new AttendanceForumDto(participant.floorNo(), latestQr, messages);
    }

    public AttendanceForumMessageDto postForumMessage(String role, String loginId, String message) {
        String cleanMessage = normalize(message)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required"));

        if (cleanMessage.length() > 1000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message must be 1000 characters or less");
        }

        ForumParticipant participant = resolveForumParticipant(role, loginId);

        AttendanceForumMessage forumMessage = new AttendanceForumMessage();
        forumMessage.setFloorNo(participant.floorNo());
        forumMessage.setAuthorId(participant.id());
        forumMessage.setAuthorName(participant.name());
        forumMessage.setAuthorRole(participant.role());
        forumMessage.setMessage(cleanMessage);

        return toMessageDto(forumMessageRepository.save(forumMessage));
    }

    private AttendanceSummaryDto buildSummary(String scope, List<Student> students, Optional<String> floorNo) {
        LocalDate today = LocalDate.now();
        List<Attendance> attendanceRows = repository.findByAttendanceDate(today);

        Set<String> scopedStudentIds = students.stream()
                .map(Student::getRegNo)
                .filter(id -> id != null && !id.isBlank())
                .map(id -> id.trim().toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<Attendance> scopedAttendanceRows = attendanceRows.stream()
                .filter(attendance -> {
                    String studentId = attendance.getStudentId();
                    return studentId != null && scopedStudentIds.contains(studentId.trim().toUpperCase(Locale.ROOT));
                })
                .collect(Collectors.toList());

        Map<String, Attendance.Status> statusByStudentId = new HashMap<>();
        scopedAttendanceRows.forEach(attendance -> {
            String studentId = attendance.getStudentId();
            if (studentId != null && !studentId.isBlank()) {
                statusByStudentId.put(studentId.trim().toUpperCase(Locale.ROOT), attendance.getStatus());
            }
        });

        boolean attendanceStarted = !scopedAttendanceRows.isEmpty();

        List<AttendanceRowDto> rows = students.stream()
                .map(student -> {
                    String regNo = defaultString(student.getRegNo(), "").toUpperCase(Locale.ROOT);
                    Attendance.Status status = statusByStudentId.get(regNo);
                    String attendanceStatus;
                    if (status == Attendance.Status.ABSENT) {
                        attendanceStatus = "ABSENT";
                    } else if (statusByStudentId.containsKey(regNo)) {
                        attendanceStatus = "PRESENT";
                    } else {
                        attendanceStatus = attendanceStarted ? "ABSENT" : "NOT TAKEN";
                    }
                    return new AttendanceRowDto(
                            student.getRegNo(),
                            student.getName(),
                            student.getRoomNo(),
                            student.getRoomType(),
                            student.getFloorNo(),
                            attendanceStatus
                    );
                })
                .collect(Collectors.toList());

        int presentCount = (int) rows.stream().filter(r -> "PRESENT".equals(r.getAttendance())).count();
        int total = rows.size();
        int absentCount = attendanceStarted ? total - presentCount : 0;

        return new AttendanceSummaryDto(scope, today, presentCount, absentCount, total, rows);
    }

    private ForumParticipant resolveForumParticipant(String role, String loginId) {
        String currentRole = defaultString(role, "").toUpperCase(Locale.ROOT);

        if ("FACULTY".equals(currentRole)) {
            Faculty faculty = facultyService.findFacultyByLoginId(loginId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Faculty profile not found"));
            String floorNo = resolveFacultyFloor(faculty)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Faculty floor not assigned"));

            return new ForumParticipant(
                    loginId,
                    defaultString(faculty.getName(), "Floor Faculty"),
                    "FACULTY",
                    floorNo
            );
        }

        if ("STUDENT".equals(currentRole)) {
            Student student = studentRepository.findByRegNo(loginId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student profile not found"));
            String floorNo = normalize(student.getFloorNo())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Student floor not assigned"));

            return new ForumParticipant(
                    student.getRegNo(),
                    defaultString(student.getName(), "Student"),
                    "STUDENT",
                    floorNo
            );
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }

    private AttendanceQrSessionDto toQrDto(AttendanceQrSession session) {
        LocalDateTime expiresAt = session.getCreatedAt() == null
                ? null
                : session.getCreatedAt().plusMinutes(ATTENDANCE_QR_VALIDITY_MINUTES);

        return new AttendanceQrSessionDto(
                session.getId(),
                session.getSessionId(),
                session.getFloorNo(),
                session.getFacultyName(),
                session.getQrData(),
                session.getQrImageDataUrl(),
                session.getCreatedAt(),
                expiresAt
        );
    }

    private boolean isAttendanceQrExpired(AttendanceQrSession session) {
        if (session == null || session.getCreatedAt() == null) {
            return true;
        }

        LocalDateTime expiresAt = session.getCreatedAt().plusMinutes(ATTENDANCE_QR_VALIDITY_MINUTES);
        return !LocalDateTime.now().isBefore(expiresAt);
    }

    private void deactivateAttendanceQrSession(AttendanceQrSession session) {
        if (session == null || !session.isActive()) {
            return;
        }

        session.setActive(false);
        qrSessionRepository.save(session);
    }

    private AttendanceForumMessageDto toMessageDto(AttendanceForumMessage message) {
        return new AttendanceForumMessageDto(
                message.getId(),
                message.getAuthorName(),
                message.getAuthorRole(),
                message.getMessage(),
                message.getCreatedAt()
        );
    }

    private Optional<String> resolveFacultyFloor(Faculty faculty) {
        Optional<String> assignedFloor = facultyService.resolveAssignedFloor(faculty);
        if (assignedFloor.isPresent()) {
            return assignedFloor;
        }
        return normalize(faculty.getFloorNo());
    }

    private boolean sameFloor(String expected, String actual) {
        Optional<String> expectedFloor = normalize(expected);
        Optional<String> actualFloor = normalize(actual);

        return expectedFloor.isPresent()
                && actualFloor.isPresent()
                && expectedFloor.get().equalsIgnoreCase(actualFloor.get());
    }

    private Optional<String> normalize(String value) {
        if (value == null) {
            return Optional.empty();
        }

        String normalized = value.trim();
        return normalized.isEmpty() ? Optional.empty() : Optional.of(normalized);
    }

    private String defaultString(String value, String fallback) {
        return normalize(value).orElse(fallback);
    }

    private record ForumParticipant(String id, String name, String role, String floorNo) {
    }
}
