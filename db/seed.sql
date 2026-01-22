-- password za sve Test1234
INSERT INTO Profile (
    username,
    password,
    email,
    role,
    is_superuser,
    is_active,
    is_staff
) VALUES
('player1', 'pbkdf2_sha256$1000000$bVgrrGYWaAcLrBp3T4xMs2$CP8sA5VoAHfvQkfC4DrMPoc2emazdIsvS6fIgrkmLcU=', 'player1@mail.com', 'PLAYER', FALSE, TRUE, FALSE),
('player2', 'pbkdf2_sha256$1000000$Vnr8wLoSnOqkMnUPAYxbuU$qa690bYMiSgx226JytkR8PabYGTX0sMxh/HmdvFkY1g=', 'player2@mail.com', 'PLAYER', FALSE, TRUE, FALSE),
('player3', 'pbkdf2_sha256$1000000$d9EeTduFNHKRUOlm2LR99t$rn/8/Fw2HjojW47rVVjjvROk6MFpLSPxPNYXPBb1dXw=', 'player3@mail.com', 'PLAYER', FALSE, TRUE, FALSE),
('club1',   'pbkdf2_sha256$1000000$Zofvb6E8W0Pj5iuRvVLpFh$B+MleKUIcUh2slbulNu0u7S/clXJfB7xeZPEDlUge/I=', 'club1@mail.com',   'CLUB',   FALSE, TRUE, FALSE),
('club2',   'pbkdf2_sha256$1000000$NroemRT7aDa9t6eo3OLQdy$LMdP2TpAipnLWlAVrVysyppDt0DT+o67DFsg9FmZA0Y=', 'club2@mail.com',   'CLUB',   FALSE, TRUE, FALSE),
('admin',  'pbkdf2_sha256$1000000$q42nZJpa07qzoPxVA03tKZ$w1/T2y0jugeXNgnhm7rmLsX+4v5LT7cPNmdyRkfoev0=', 'admin@mail.com',  'ADMIN',  TRUE,  TRUE, TRUE);

INSERT INTO "player" (
    "userId",
    "firstName",
    "lastName",
    "phoneNumber",
    "skillLevel",
    "preferredDow",
    "preferredTime"
)
SELECT
    p."id",
    v."firstName",
    v."lastName",
    v."phoneNumber",
    v."skillLevel",
    v."preferredDow",
    v."preferredTime"
FROM (
    VALUES
    ('player1', 'Marko', 'Kovač', '0911111111', 'BEGINNER', 2, TIME '18:00')
) AS v(
    username,
    "firstName",
    "lastName",
    "phoneNumber",
    "skillLevel",
    "preferredDow",
    "preferredTime"
)
JOIN "profile" p ON p."username" = v.username;

INSERT INTO "club" (
    "userId",
    "name",
    "address",
    "description",
    "workingHours",
    "contactNumber",
    "ratingAvg"
)
SELECT
    p.id,
    v.name,
    v.address,
    v.description,
    v.workingHours,
    v.contactNumber,
    v.ratingAvg
FROM (
    VALUES
    ('club1', 'Padel Klub Zagreb', 'Zagreb, Ulica 1',
     'Najbolji padel klub u Hrvatskoj', '08:00-22:00', '0911111111', 4.5),

    ('club2', 'Padel Klub Split', 'Split, Ulica 2',
     'Klub za sve ljubitelje padela', '08:00-22:00', '0912222222', 4.7)
) AS v(
    username,
    name,
    address,
    description,
    workingHours,
    contactNumber,
    ratingAvg
)
JOIN Profile p ON p.username = v.username;

INSERT INTO "admin" (
    "userId",
    "firstName",
    "lastName",
    "canManageUsers",
    "canManageBookings"
)
SELECT
    p.id,
    v.firstName,
    v.lastName,
    v.canManageUsers,
    v.canManageBookings
FROM (
    VALUES
    ('admin1', 'Ana', 'Marić', TRUE, TRUE)
) AS v(
    username,
    firstName,
    lastName,
    canManageUsers,
    canManageBookings
)
JOIN Profile p ON p.username = v.username;

