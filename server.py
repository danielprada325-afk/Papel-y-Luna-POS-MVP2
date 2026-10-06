from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.parse import urlparse, parse_qs
from urllib.error import HTTPError
import json
import time


APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby1ZDTBP-TlPC3HFTU_n0LrM59PGJU3Sg3q3IJIqMWSDFM_1d6rT_tpWSULNGR_zPDPpw/exec"


def google_get(resource):

    for intento in range(1, 8):

        try:

            url = (
                f"{APPS_SCRIPT_URL}"
                f"?resource={resource}"
                f"&_={int(time.time() * 1000)}"
            )

            print(f"Google → {resource} → intento {intento}/7")

            request = Request(
                url,
                headers={
                    "User-Agent": "Papel-y-Luna-POS"
                }
            )

            response = urlopen(
                request,
                timeout=15
            )

            resultado = response.read()

            print(
                f"OK → {resource}"
            )

            return resultado

        except HTTPError as error:

            print(
                f"Google HTTP {error.code} → {resource}"
            )

        except Exception as error:

            print(
                f"Error → {resource}: {error}"
            )

        if intento < 7:
            time.sleep(3)

    raise Exception(
        f"No se pudo obtener {resource}"
    )


def google_post(resource, body):

    for intento in range(1, 8):

        try:

            url = (
                f"{APPS_SCRIPT_URL}"
                f"?resource={resource}"
                f"&_={int(time.time() * 1000)}"
            )

            print(
                f"Google → POST {resource} → intento {intento}/7"
            )

            datos = json.dumps(body).encode("utf-8")

            request = Request(
                url,
                data=datos,
                headers={
                    "User-Agent": "Papel-y-Luna-POS",
                    "Content-Type": "text/plain;charset=utf-8"
                },
                method="POST"
            )

            response = urlopen(
                request,
                timeout=30
            )

            resultado = response.read()

            print(
                f"OK POST → {resource}"
            )

            return resultado

        except HTTPError as error:

            print(
                f"Google POST HTTP {error.code} → {resource}"
            )

        except Exception as error:

            print(
                f"Error POST → {resource}: {error}"
            )

        if intento < 7:
            time.sleep(3)

    raise Exception(
        f"No se pudo guardar {resource}"
    )


class POSHandler(SimpleHTTPRequestHandler):

    def do_GET(self):

        parsed = urlparse(self.path)

        if parsed.path != "/api":
            return super().do_GET()

        params = parse_qs(parsed.query)

        resource = params.get(
            "resource",
            [None]
        )[0]

        if not resource:

            self.send_error(
                400,
                "Falta resource"
            )

            return

        print(
            f"\nGET /api?resource={resource}"
        )

        try:

            resultado = google_get(resource)

            self.send_response(200)

            self.send_header(
                "Content-Type",
                "application/json"
            )

            self.send_header(
                "Cache-Control",
                "no-store"
            )

            self.send_header(
                "Access-Control-Allow-Origin",
                "*"
            )

            self.end_headers()

            self.wfile.write(resultado)

        except Exception as error:

            print(
                "ERROR:",
                error
            )

            try:

                respuesta = json.dumps({
                    "success": False,
                    "message": str(error)
                }).encode()

                self.send_response(500)

                self.send_header(
                    "Content-Type",
                    "application/json"
                )

                self.send_header(
                    "Access-Control-Allow-Origin",
                    "*"
                )

                self.end_headers()

                self.wfile.write(respuesta)

            except BrokenPipeError:
                pass


    def do_POST(self):

        parsed = urlparse(self.path)

        if parsed.path != "/api":

            self.send_error(
                404,
                "Not Found"
            )

            return

        params = parse_qs(parsed.query)

        resource = params.get(
            "resource",
            [None]
        )[0]

        if not resource:

            self.send_error(
                400,
                "Falta resource"
            )

            return

        print(
            f"\nPOST /api?resource={resource}"
        )

        try:

            longitud = int(
                self.headers.get(
                    "Content-Length",
                    "0"
                )
            )

            contenido = self.rfile.read(
                longitud
            )

            body = json.loads(
                contenido.decode("utf-8")
            )

            resultado = google_post(
                resource,
                body
            )

            self.send_response(200)

            self.send_header(
                "Content-Type",
                "application/json"
            )

            self.send_header(
                "Cache-Control",
                "no-store"
            )

            self.send_header(
                "Access-Control-Allow-Origin",
                "*"
            )

            self.end_headers()

            self.wfile.write(resultado)

        except Exception as error:

            print(
                "ERROR POST:",
                error
            )

            try:

                respuesta = json.dumps({
                    "success": False,
                    "message": str(error)
                }).encode("utf-8")

                self.send_response(500)

                self.send_header(
                    "Content-Type",
                    "application/json"
                )

                self.send_header(
                    "Access-Control-Allow-Origin",
                    "*"
                )

                self.end_headers()

                self.wfile.write(
                    respuesta
                )

            except BrokenPipeError:
                pass


    def do_OPTIONS(self):

        self.send_response(200)

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.send_header(
            "Access-Control-Allow-Methods",
            "GET, POST, OPTIONS"
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type"
        )

        self.end_headers()


print("")
print("==============================")
print("     PAPEL Y LUNA POS")
print("     http://localhost:8000")
print("==============================")
print("")


import os

PORT = int(os.environ.get("PORT", 8000))

server = ThreadingHTTPServer(
    ("0.0.0.0", PORT),
    POSHandler
)

server.serve_forever()