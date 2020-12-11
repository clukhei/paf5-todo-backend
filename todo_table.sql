DROP SCHEMA IF EXISTS `todo`;
CREATE SCHEMA IF NOT EXISTS `todo` DEFAULT CHARACTER SET latin1;

CREATE TABLE IF NOT EXISTS `todo`.`maintasks`(
    `id` INT(3) NOT NULL AUTO_INCREMENT,
     `maintask_title` VARCHAR(100) NOT NULL,
     `maintask_img` VARCHAR(10000) NULL DEFAULT NULL,
     `maintask_status` BOOLEAN DEFAULT FALSE,
     `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`)
)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


CREATE TABLE IF NOT EXISTS `todo`.`subtasks`(
    `id` INT(3) NOT NULL AUTO_INCREMENT,
    `maintask_id` INT(3) NOT NULL ,
    `subtask_title` VARCHAR(50) NULL DEFAULT NULL,
    `substask_status` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `substask_status` (`substask_status` ASC),
    INDEX `maintask_id` (`maintask_id` ASC),
    CONSTRAINT `fk_maintask`
        FOREIGN KEY(`maintask_id`)
        REFERENCES `todo`.`maintasks`(`id`)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
)
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;