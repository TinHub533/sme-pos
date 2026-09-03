package com.smepos.repository;

import com.smepos.entity.AppUser;
import com.smepos.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByUsername(String username);
    List<AppUser> findByShopIdOrderByCreatedAtAsc(UUID shopId);
    long countByShopId(UUID shopId);
    boolean existsByRole(Role role);
    List<AppUser> findByRoleOrderByCreatedAtAsc(Role role);
}
