

USE `todo`;

INSERT INTO `maintasks`(`maintask_title`, `maintask_img`) values ('watch poopybutthole', 'https://pyxis.nymag.com/v1/imgs/cc7/0ba/f8f09cf15c22bc493492c81b7b192c411c-11-rick-and-morty-304.rsquare.w700.jpg');
INSERT INTO `maintasks`(`maintask_title`, `maintask_img`) values ('watch morty', 'https://banner2.cleanpng.com/20180511/scw/kisspng-rick-sanchez-sticker-telegram-clip-art-5af54d68ba6a05.8512155015260255767636.jpg');

INSERT INTO `subtasks` (`maintask_id`, `subtask_title`, `substask_status`) values (1, 'finish watching poopybutthole series', 1);
INSERT INTO `subtasks` (`maintask_id`, `subtask_title`, `substask_status`) values (1, 'rewatch with friends', 0);
INSERT INTO `subtasks` (`maintask_id`, `subtask_title`, `substask_status`) values (2, 'finish watching morty ', 0);
INSERT INTO `subtasks` (`maintask_id`, `subtask_title`, `substask_status`) values (2, 'watch episode 1 with friend ', 1);


