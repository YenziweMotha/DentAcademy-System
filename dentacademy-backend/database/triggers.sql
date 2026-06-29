DELIMITER //
CREATE TRIGGER prevent_audit_modification
BEFORE UPDATE ON audit_log
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Audit log records cannot be modified';
END //
CREATE TRIGGER prevent_audit_deletion
BEFORE DELETE ON audit_log
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
  SET MESSAGE_TEXT = 'Audit log records cannot be deleted';
END //
DELIMITER ;
