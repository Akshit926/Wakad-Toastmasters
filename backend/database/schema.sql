CREATE DATABASE IF NOT EXISTS toastmasters_db;
USE toastmasters_db;

-- 1. Members Table
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_other VARCHAR(255),
    photo_url VARCHAR(500) NOT NULL,
    photo_filename VARCHAR(255) NOT NULL,
    introduction TEXT,
    why_join TEXT,
    preferred_role VARCHAR(100),
    hobbies TEXT NOT NULL,
    queries TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Contacts Table (for Contact Form Submissions)
CREATE TABLE IF NOT EXISTS contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Roles Table (Static roles available to be booked)
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE
);

-- 4. Member_Roles Mapping Table (Tracks who is doing what and when)
-- NOTE: Pending_Allocation / Pending_Cancel are intermediate states before admin approval
CREATE TABLE IF NOT EXISTS member_roles (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    member_id    INT NOT NULL,
    role_id      INT NOT NULL,
    meeting_date DATE NOT NULL,
    status       ENUM(
                     'Pending_Allocation',
                     'Assigned',
                     'Pending_Cancel',
                     'Cancelled'
                 ) DEFAULT 'Pending_Allocation',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Insert standard Toastmasters roles
INSERT IGNORE INTO roles (role_name) VALUES 
('Toastmaster of the Day'), 
('General Evaluator'), 
('Ah-Counter'), 
('Grammarian'), 
('Timer'), 
('Speaker'), 
('Evaluator');
