/* QA-only adapter to the public LibreOfficeKit API; never generates DOCX XML. */
#include <stdbool.h>
#include <LibreOfficeKit/LibreOfficeKit.h>
#include <dlfcn.h>
#include <limits.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int path(char *output, const char *root, const char *suffix)
{
    return snprintf(output, PATH_MAX, "%s/%s", root, suffix) < PATH_MAX;
}

static void error(LibreOfficeKit *kit, const char *operation)
{
    char *message = kit->pClass->getError(kit);
    fprintf(stderr, "LibreOfficeKit %s failed: %s\n", operation, message ? message : "no diagnostic");
    kit->pClass->freeError(message);
}

int main(int argc, char **argv)
{
    const char *root = getenv("DOCX_NEXT_LO_ROOT");
    bool version = argc == 3 && strcmp(argv[1], "--version") == 0;
    if (!root || (!version && argc != 5)) {
        fprintf(stderr, "Usage: DOCX_NEXT_LO_ROOT=... lo-kit --version PROFILE_URI | PROFILE_URI INPUT_URI OUTPUT_URI pdf|docx\n");
        return 2;
    }
    if (!version && strcmp(argv[4], "pdf") && strcmp(argv[4], "docx")) {
        fprintf(stderr, "Unsupported QA format: %s\n", argv[4]);
        return 2;
    }
    char program[PATH_MAX], library[PATH_MAX], data[PATH_MAX];
    if (!path(program, root, "usr/lib/libreoffice/program") ||
        !path(library, root, "usr/lib/libreoffice/program/libmergedlo.so") ||
        !path(data, root, "usr/share/liblangtag")) {
        fprintf(stderr, "QA runtime path is too long\n");
        return 2;
    }
    void *handle = dlopen(library, RTLD_NOW | RTLD_GLOBAL);
    if (!handle) {
        fprintf(stderr, "LibreOfficeKit library failed: %s\n", dlerror());
        return 1;
    }
    LibreOfficeKit *(*init)(const char *, const char *) = dlsym(handle, "libreofficekit_hook_2");
    void (*set_data_directory)(const char *) = dlsym(handle, "lt_db_set_datadir");
    if (!init || !set_data_directory) {
        fprintf(stderr, "Required LibreOfficeKit/liblangtag API is unavailable\n");
        return 1;
    }
    /* Relocate the packaged language data through liblangtag's public API. */
    set_data_directory(data);
    LibreOfficeKit *kit = init(program, version ? argv[2] : argv[1]);
    if (!kit || !LIBREOFFICEKIT_HAS(kit, getVersionInfo)) {
        fprintf(stderr, "LibreOfficeKit initialization/version API failed\n");
        return 1;
    }
    if (version) {
        char *info = kit->pClass->getVersionInfo(kit);
        if (!info) {
            error(kit, "version");
            kit->pClass->destroy(kit);
            return 1;
        }
        puts(info);
        free(info);
        kit->pClass->destroy(kit);
        return 0;
    }
    LibreOfficeKitDocument *document = kit->pClass->documentLoad(kit, argv[2]);
    if (!document) {
        error(kit, "load");
        kit->pClass->destroy(kit);
        return 1;
    }
    int saved = document->pClass->saveAs(document, argv[3], argv[4], NULL);
    if (!saved) error(kit, "save");
    document->pClass->destroy(document);
    kit->pClass->destroy(kit);
    return saved ? 0 : 1;
}
