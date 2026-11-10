-- Up Migration
create table robots (
  id integer generated always as identity primary key,
  name text not null unique,
  status text not null default 'idle' check (status in ('idle', 'moving')),
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180),
  updated_at timestamptz not null default now()
);

-- Down Migration
drop table robots;
