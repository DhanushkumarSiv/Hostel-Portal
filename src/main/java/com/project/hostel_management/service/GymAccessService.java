package com.project.hostel_management.service;

import com.project.hostel_management.model.GymAccess;
import com.project.hostel_management.repository.GymAccessRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class GymAccessService {

    @Autowired
    private GymAccessRepository repository;

    public String scanGymQR(String studentId,
                             String studentName,
                             String roomNo,
                             String mobileNo) {

        Optional<GymAccess> activeEntry =
                repository.findByStudentIdAndStatus(studentId, "ACTIVE");

        // RETURNING KEY
        if (activeEntry.isPresent()) {

            GymAccess access = activeEntry.get();

            access.setCloseTime(LocalDateTime.now());
            access.setStatus("RETURNED");

            repository.save(access);

            return "Gym key returned successfully";
        }

        // TAKING KEY
        GymAccess access = new GymAccess();

        access.setStudentId(studentId);
        access.setStudentName(studentName);
        access.setRoomNo(roomNo);
        access.setMobileNo(mobileNo);

        access.setOpenTime(LocalDateTime.now());
        access.setStatus("ACTIVE");

        repository.save(access);

        return "Gym key taken successfully";
    }

    public String getGymStatus() {

        Optional<GymAccess> activeGym =
                repository.findByStatus("ACTIVE");

        if (activeGym.isPresent()) {
            return "GYM OPENED";
        }

        return "GYM CLOSED";
    }
}