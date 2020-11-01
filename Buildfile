[*main*]
tasks=assemble,xpi
VERSION=${shell grep -Po "(?<=<em:version>).+(?=<)" install.rdf}

[assemble]
tool=cmd
echo ${VERSION}

[xpi]
tool=zip
filename=palefill-${VERSION}.xpi
files=xpi.files

[xpi.files]
install.rdf=
bootstrap.js=
lib/*.js=lib/

