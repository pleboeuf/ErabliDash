CREATE TABLE devices (
    device_id varchar(24),
    device_name varchar(10),
    last_serial_no integer
);

CREATE TABLE tanks (
    device_id varchar(24),
    level_event_name varchar(100),
    last_updated_at timestamp
);
