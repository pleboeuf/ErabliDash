CREATE TABLE devices (
    device_id varchar(24) PRIMARY KEY,
    device_name varchar(10),
    last_serial_no integer
);

CREATE TABLE tanks (
    tank_id integer PRIMARY_KEY,
    device_id varchar(24),
    level_event_name varchar(100),
    last_updated_at timestamp
);

INSERT INTO devices (device_id, device_name) VALUES ('1f003f000747343337373738', 'A');
INSERT INTO devices (device_id, device_name) VALUES ('3a0025000847343337373738', 'B');
INSERT INTO devices (device_id, device_name) VALUES ('3a0037000c47343233323032', 'C');
