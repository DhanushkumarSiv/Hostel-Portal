package com.project.hostel_management.service;

import com.project.hostel_management.model.Menu;
import com.project.hostel_management.repository.MenuRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MenuService {

    @Autowired
    private MenuRepository menuRepository;

    // Get all menu items
    public List<Menu> getAllMenus() {
        return menuRepository.findAll();
    }

    // Save menu
    public Menu saveMenu(Menu menu) {
        return menuRepository.save(menu);
    }

    // Get menu by ID
    public Menu getMenuById(Long id) {
        return menuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu not found for id: " + id));
    }

    // Update menu by ID
    public Menu updateMenu(Long id, Menu updatedMenu) {
        Menu existing = menuRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Menu not found for id: " + id));

        existing.setDays(updatedMenu.getDays());
        existing.setBreakfast(updatedMenu.getBreakfast());
        existing.setLunch(updatedMenu.getLunch());
        existing.setSnacks(updatedMenu.getSnacks());
        existing.setDinner(updatedMenu.getDinner());

        return menuRepository.save(existing);
    }
}