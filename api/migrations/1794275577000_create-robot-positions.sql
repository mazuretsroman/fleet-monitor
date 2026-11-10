-- Up Migration
create table robot_positions (
  id integer generated always as identity primary key,
  robot_id integer not null references robots (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  recorded_at timestamptz not null default now()
);

create index robot_positions_robot_id_recorded_at_idx
  on robot_positions (robot_id, recorded_at desc);

-- Down Migration
drop table robot_positions;
