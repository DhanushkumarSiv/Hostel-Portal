package com.project.hostel_management.service;

import com.project.hostel_management.model.IndoorCourt;
import com.project.hostel_management.repository.IndoorCourtRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class IndoorCourtService {

    @Autowired
    private IndoorCourtRepository repository;

    public String scanIndoorCourtQR(String studentId,
                                    String studentName,
                                    String roomNo,
                                    String mobileNo) {

        Optional<IndoorCourt> activeEntry =
                repository.findByStudentIdAndStatus(studentId, "ACTIVE");

        // RETURNING KEY
        if (activeEntry.isPresent()) {

            IndoorCourt access = activeEntry.get();

            access.setCloseTime(LocalDateTime.now());
            access.setStatus("RETURNED");

            repository.save(access);

            return "Indoor court key returned successfully";
        }

        // TAKING KEY
        IndoorCourt access = new IndoorCourt();

        access.setStudentId(studentId);
        access.setStudentName(studentName);
        access.setRoomNo(roomNo);
        access.setMobileNo(mobileNo);

        access.setOpenTime(LocalDateTime.now());
        access.setStatus("ACTIVE");

        repository.save(access);

        return "Indoor court key taken successfully";
    }

    public String getIndoorCourtStatus() {

        Optional<IndoorCourt> activeIndoorCourt =
                repository.findByStatus("ACTIVE");

        if (activeIndoorCourt.isPresent()) {
            return "INDOOR COURT OPENED";
        }

        return "INDOOR COURT CLOSED";
    }
}