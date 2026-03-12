-- campuswire_schema.sql (FINAL)
DROP DATABASE IF EXISTS campuswire_db;
CREATE DATABASE campuswire_db;
USE campuswire_db;

-- ------------------------
-- USERS TABLE
-- ------------------------
CREATE TABLE `User` (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  is_verified TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  dept VARCHAR(50),
  year INT,
  role ENUM('Student','Moderator','Admin') DEFAULT 'Student',
  warning_level ENUM('Green','Orange','Red') DEFAULT 'Green',
  warning_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------
-- POSTS TABLE
-- ------------------------
CREATE TABLE `Post` (
  post_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  image_path VARCHAR(255) DEFAULT NULL,
  emotion ENUM('Happy','Sad','Angry','Excited','Neutral') DEFAULT 'Neutral',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Active','Flagged','Deleted') DEFAULT 'Active',
  FOREIGN KEY (user_id) REFERENCES `User`(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------
-- REACTION TABLE (Like/Comment)
-- ------------------------
CREATE TABLE `Reaction` (
  reaction_id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  type ENUM('Like','Comment','Share') NOT NULL,
  comment_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES `Post`(post_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES `User`(user_id)
) ENGINE=InnoDB;

-- ------------------------
-- WARNING TABLE
-- ------------------------
CREATE TABLE `Warning` (
  warning_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reason VARCHAR(255),
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES `User`(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------
-- FESTIVAL THEME TABLE
-- ------------------------
CREATE TABLE `FestivalTheme` (
  theme_id INT AUTO_INCREMENT PRIMARY KEY,
  festival_name VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  primary_color VARCHAR(20),
  secondary_color VARCHAR(20),
  background_image VARCHAR(255),
  banner_image VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------
-- EMOTION FEED
-- ------------------------
CREATE TABLE `EmotionFeed` (
  feed_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  emotion_preference ENUM('Happy','Sad','Angry','Excited','Neutral') DEFAULT 'Neutral',
  suggested_post_id INT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES `User`(user_id),
  FOREIGN KEY (suggested_post_id) REFERENCES `Post`(post_id)
) ENGINE=InnoDB;

-- ------------------------
-- REPORT TABLE
-- ------------------------
CREATE TABLE `Report` (
  report_id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  reported_by INT NOT NULL,
  reason VARCHAR(255),
  report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES `Post`(post_id),
  FOREIGN KEY (reported_by) REFERENCES `User`(user_id)
) ENGINE=InnoDB;

-- ------------------------
-- EMAIL VERIFICATION TABLE
-- ------------------------
CREATE TABLE `EmailVerification` (
  token VARCHAR(128) PRIMARY KEY,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES `User`(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------
-- TRIGGERS
-- ------------------------
DELIMITER $$

CREATE TRIGGER prevent_duplicate_email
BEFORE INSERT ON `User`
FOR EACH ROW
BEGIN
  IF (SELECT COUNT(*) FROM `User` WHERE email = NEW.email) > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account already exists for this email.';
  END IF;
END$$

CREATE TRIGGER issue_warning_after_flag
AFTER UPDATE ON `Post`
FOR EACH ROW
BEGIN
  IF NEW.status = 'Flagged' AND OLD.status <> 'Flagged' THEN
    INSERT INTO `Warning`(user_id, reason) VALUES (NEW.user_id, CONCAT('Post flagged (post_id=', NEW.post_id, ')'));
    UPDATE `User`
    SET warning_count = warning_count + 1,
        warning_level = CASE
          WHEN warning_count + 1 >= 3 THEN 'Red'
          WHEN warning_count + 1 = 2 THEN 'Orange'
          ELSE 'Green'
        END
    WHERE user_id = NEW.user_id;
  END IF;
END$$

-- automatic deactivation after warnings exceed 5
CREATE TRIGGER deactivate_user_after_excessive_warnings
AFTER UPDATE ON `User`
FOR EACH ROW
BEGIN
  IF NEW.warning_count >= 5 THEN
    UPDATE `User` SET is_active = 0 WHERE user_id = NEW.user_id;
  END IF;
END$$

DELIMITER ;

-- ------------------------
-- STORED PROCS & VIEWS (unchanged)
-- ------------------------
DELIMITER $$

CREATE PROCEDURE getEmotionFeed(IN uid INT)
BEGIN
  DECLARE emo ENUM('Happy','Sad','Angry','Excited','Neutral');
  DECLARE userPresent INT DEFAULT 0;
  SELECT COUNT(*) INTO userPresent FROM `EmotionFeed` WHERE user_id = uid;
  IF userPresent = 1 THEN
    SELECT emotion_preference INTO emo FROM `EmotionFeed` WHERE user_id = uid LIMIT 1;
  ELSE
    SET emo = 'Neutral';
  END IF;

  IF emo = 'Sad' THEN
    SELECT * FROM `Post` WHERE emotion IN ('Happy','Excited') AND status='Active' ORDER BY created_at DESC;
  ELSEIF emo = 'Angry' THEN
    SELECT * FROM `Post` WHERE emotion IN ('Neutral','Happy') AND status='Active' ORDER BY created_at DESC;
  ELSEIF emo = 'Happy' THEN
    SELECT * FROM `Post` WHERE emotion IN ('Happy','Excited') AND status='Active' ORDER BY created_at DESC;
  ELSEIF emo = 'Excited' THEN
    SELECT * FROM `Post` WHERE emotion IN ('Excited','Happy') AND status='Active' ORDER BY created_at DESC;
  ELSE
    SELECT * FROM `Post` WHERE status='Active' ORDER BY created_at DESC;
  END IF;
END$$
DELIMITER ;

CREATE VIEW FlaggedPosts AS
SELECT P.post_id, P.user_id, U.name AS author_name, P.content, P.created_at
FROM `Post` P JOIN `User` U ON P.user_id = U.user_id
WHERE P.status = 'Flagged'
ORDER BY P.created_at DESC;

CREATE EVENT IF NOT EXISTS purge_red_users
ON SCHEDULE EVERY 1 WEEK
DO
  DELETE FROM `User` WHERE warning_level = 'Red' AND warning_count >= 5;

-- sample data
INSERT INTO `User`(name, email, password, dept, year, role)
VALUES
('Admin','admin@mail.jiit.ac.in','hashed_pw_admin','AdminDept',0,'Admin');

INSERT INTO `FestivalTheme`(festival_name, start_date, end_date, primary_color, secondary_color, background_image, banner_image)
VALUES
('Diwali','2025-10-20','2025-10-27','#FFD700','#FF9933','/themes/diwali_bg.png','/themes/diwali_banner.svg'),
('Christmas','2025-12-20','2025-12-26','#B30000','#FFFFFF','/themes/christmas_bg.png','/themes/christmas_banner.svg');

-- end
ALTER TABLE Reaction ADD COLUMN reaction_type ENUM('like', 'love', 'funny', 'insightful') DEFAULT 'like';
CREATE TABLE Followers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    FOREIGN KEY (follower_id) REFERENCES User(user_id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES User(user_id) ON DELETE CASCADE
);
