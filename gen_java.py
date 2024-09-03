import os
import re
import sys

pwd = os.getcwd()


def main():
    args = sys.argv
    if ("src/main/java" in pwd):
        package = re.sub(".+/src/main/java/", "", pwd)
        package = package.replace("/", ".")
        for arg in args[1:]:
            with open(pwd + "/" + arg + ".java", "w") as f:
                f.write("""package {};
                
public class {} {{
}}
                """.format(package, arg))


if __name__ == '__main__':
    main()
