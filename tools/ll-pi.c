#define _GNU_SOURCE

#include <errno.h>
#include <fcntl.h>
#include <linux/landlock.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>

struct right {
	const char *name;
	uint64_t access;
	int min_abi;
};

static const struct right rights[] = {
	{ "read_file", LANDLOCK_ACCESS_FS_READ_FILE, 1 },
	{ "write_file", LANDLOCK_ACCESS_FS_WRITE_FILE, 1 },
	{ "read_dir", LANDLOCK_ACCESS_FS_READ_DIR, 1 },
	{ "remove_dir", LANDLOCK_ACCESS_FS_REMOVE_DIR, 1 },
	{ "remove_file", LANDLOCK_ACCESS_FS_REMOVE_FILE, 1 },
	{ "make_char", LANDLOCK_ACCESS_FS_MAKE_CHAR, 1 },
	{ "make_dir", LANDLOCK_ACCESS_FS_MAKE_DIR, 1 },
	{ "make_reg", LANDLOCK_ACCESS_FS_MAKE_REG, 1 },
	{ "make_sock", LANDLOCK_ACCESS_FS_MAKE_SOCK, 1 },
	{ "make_fifo", LANDLOCK_ACCESS_FS_MAKE_FIFO, 1 },
	{ "make_block", LANDLOCK_ACCESS_FS_MAKE_BLOCK, 1 },
	{ "make_sym", LANDLOCK_ACCESS_FS_MAKE_SYM, 1 },
	{ "refer", LANDLOCK_ACCESS_FS_REFER, 2 },
	{ "truncate", LANDLOCK_ACCESS_FS_TRUNCATE, 3 },
	{ "execute", LANDLOCK_ACCESS_FS_EXECUTE, 1 },
};

static int parse_rights(const char *text, uint64_t *access)
{
	const char *item = text;
	uint64_t result = 0;

	if (*text == '\0') {
		fprintf(stderr, "ll-pi: right lists must not be empty\n");
		return -1;
	}

	for (;;) {
		const char *comma = strchr(item, ',');
		size_t length = comma ? (size_t)(comma - item) : strlen(item);
		size_t i;
		int found = 0;

		if (length == 0) {
			fprintf(stderr, "ll-pi: empty right name in list '%s'\n", text);
			return -1;
		}
		for (i = 0; i < sizeof(rights) / sizeof(rights[0]); i++) {
			if (strlen(rights[i].name) == length &&
			    memcmp(item, rights[i].name, length) == 0) {
				if (result & rights[i].access) {
					fprintf(stderr, "ll-pi: duplicate right '%s'\n",
						rights[i].name);
					return -1;
				}
				result |= rights[i].access;
				found = 1;
				break;
			}
		}
		if (!found) {
			fprintf(stderr, "ll-pi: unknown right in list '%s'\n", text);
			return -1;
		}
		if (!comma)
			break;
		item = comma + 1;
	}

	*access = result;
	return 0;
}

static int parse_arguments(int argc, char **argv, uint64_t *handled,
			   int *command_index)
{
	int i;

	if (argc < 3 || strcmp(argv[1], "--handled") != 0) {
		fprintf(stderr, "ll-pi: --handled is required exactly once and must be first\n");
		return -1;
	}
	if (parse_rights(argv[2], handled) != 0)
		return -1;

	i = 3;
	while (i < argc && strcmp(argv[i], "--") != 0) {
		uint64_t rule_access;

		if (strcmp(argv[i], "--handled") == 0) {
			fprintf(stderr, "ll-pi: duplicate --handled option\n");
			return -1;
		}
		if (strcmp(argv[i], "--rule") != 0) {
			fprintf(stderr, "ll-pi: expected --rule or --, got '%s'\n",
				argv[i]);
			return -1;
		}
		if (argc - i < 3) {
			fprintf(stderr, "ll-pi: --rule requires a path and a right list\n");
			return -1;
		}
		if (argv[i + 1][0] != '/') {
			fprintf(stderr, "ll-pi: rule path must be absolute: '%s'\n",
				argv[i + 1]);
			return -1;
		}
		if (parse_rights(argv[i + 2], &rule_access) != 0)
			return -1;
		if (rule_access & ~*handled) {
			fprintf(stderr, "ll-pi: rule rights must be a subset of --handled\n");
			return -1;
		}
		i += 3;
	}

	if (i == argc) {
		fprintf(stderr, "ll-pi: missing -- before the pi command\n");
		return -1;
	}
	if (argc - i < 4) {
		fprintf(stderr, "ll-pi: expected an absolute pi executable followed by --mode rpc\n");
		return -1;
	}
	if (argv[i + 1][0] != '/') {
		fprintf(stderr, "ll-pi: pi executable must be an absolute path\n");
		return -1;
	}
	if (strcmp(argv[i + 2], "--mode") != 0 ||
	    strcmp(argv[i + 3], "rpc") != 0) {
		fprintf(stderr, "ll-pi: only pi --mode rpc is permitted\n");
		return -1;
	}
	*command_index = i + 1;
	for (i += 4; i < argc; i++) {
		if (strcmp(argv[i], "--mode") == 0 ||
		    strncmp(argv[i], "--mode=", 7) == 0) {
			fprintf(stderr, "ll-pi: duplicate --mode option is not permitted\n");
			return -1;
		}
	}

	return 0;
}

static int add_rules(int argc, char **argv, int ruleset_fd)
{
	int i = 3;

	while (i < argc && strcmp(argv[i], "--") != 0) {
		struct landlock_path_beneath_attr rule = { 0 };
		uint64_t rule_access;
		int path_fd;

		if (parse_rights(argv[i + 2], &rule_access) != 0)
			return -1;
		path_fd = open(argv[i + 1], O_PATH | O_CLOEXEC);
		if (path_fd < 0) {
			fprintf(stderr, "ll-pi: cannot open rule path '%s': %s\n",
				argv[i + 1], strerror(errno));
			return -1;
		}
		rule.allowed_access = rule_access;
		rule.parent_fd = path_fd;
		if (syscall(SYS_landlock_add_rule, ruleset_fd,
			    LANDLOCK_RULE_PATH_BENEATH, &rule, 0) != 0) {
			int saved_errno = errno;

			close(path_fd);
			fprintf(stderr, "ll-pi: cannot add rule for '%s': %s\n",
				argv[i + 1], strerror(saved_errno));
			return -1;
		}
		close(path_fd);
		i += 3;
	}
	return 0;
}

int main(int argc, char **argv)
{
	struct landlock_ruleset_attr attr = { 0 };
	uint64_t handled;
	long abi;
	size_t i;
	int command_index;
	int ruleset_fd;

	if (parse_arguments(argc, argv, &handled, &command_index) != 0)
		return 2;

	abi = syscall(SYS_landlock_create_ruleset, NULL, 0,
		      LANDLOCK_CREATE_RULESET_VERSION);
	if (abi < 0) {
		fprintf(stderr, "ll-pi: cannot query Landlock ABI: %s\n",
			strerror(errno));
		return 1;
	}
	for (i = 0; i < sizeof(rights) / sizeof(rights[0]); i++) {
		if ((handled & rights[i].access) && abi < rights[i].min_abi) {
			fprintf(stderr,
				"ll-pi: right '%s' requires Landlock ABI %d; kernel provides ABI %ld\n",
				rights[i].name, rights[i].min_abi, abi);
			return 1;
		}
	}

	attr.handled_access_fs = handled;
	ruleset_fd = (int)syscall(SYS_landlock_create_ruleset, &attr,
				  sizeof(attr), 0);
	if (ruleset_fd < 0) {
		fprintf(stderr, "ll-pi: cannot create Landlock ruleset: %s\n",
			strerror(errno));
		return 1;
	}
	if (add_rules(argc, argv, ruleset_fd) != 0) {
		close(ruleset_fd);
		return 1;
	}
	if (prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0) {
		fprintf(stderr, "ll-pi: cannot set no_new_privs: %s\n",
			strerror(errno));
		close(ruleset_fd);
		return 1;
	}
	if (syscall(SYS_landlock_restrict_self, ruleset_fd, 0) != 0) {
		fprintf(stderr, "ll-pi: cannot restrict process with Landlock: %s\n",
			strerror(errno));
		close(ruleset_fd);
		return 1;
	}
	close(ruleset_fd);

	execv(argv[command_index], &argv[command_index]);
	fprintf(stderr, "ll-pi: cannot exec '%s': %s\n", argv[command_index],
		strerror(errno));
	return 1;
}
