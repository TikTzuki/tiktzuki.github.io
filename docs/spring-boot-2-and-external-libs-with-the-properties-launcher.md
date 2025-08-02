Spring Boot 2 and external libs with the PropertiesLauncher
===============================================================

**In the world of Docker containers, Spring Boot is really a nice way of creating compact self-runnable applications
where the needed servlet container is embedded into the executable JAR/WAR file. Creating a docker container would be a
no brainer, if….**

![](https://miro.medium.com/max/1312/1*uDciVmKqrDUGybzDh_koOw.png)

… if the application to package wouldnt be a **JSP based** application. Because if thats the case, some major problems
arise. It starts with the fact that you cant use an executable JAR because the embedded servlet container is not able to
find the JSPs anymore due to the way the JAR is structured. So forget the “bootJar” task in gradle, you should never use
it.

\[ If you start from scratch with your application, really consider using Thymeleaf instead, because you wont have any
issues with that templating system.\]

The rescue is the “bootWar” task, which creates, as you can imagine, a WAR file with structure the internal
ServletContainer can handle when it comes to JSPs. If your application only consists of this WAR file and there is no
need to plug in customer based libraries, then you are done here. Spring will use the
org.springframework.boot.loader.WarLauncher internally to start the application.

But what if you need external libs which are not bundled?
---------------------------------------------------------

Most enterprise grade applications have the need to ship customer based artifacts together with the product itself. But
most likely you dont want to include those in the product WAR itself because that would mean that you need to have a
build target for each and every customer.

Let’s take the following directory structure, which will be present in the docker image at the end:

![](https://miro.medium.com/max/956/1*_BajDL92q9lA0xO8lp51Aw.png)

Our docker container loads the specified version (1.0.0) of the application from our application repository and also
loads customers based artifacts from that repository. On starting up the container, we supply those variables like
appVersion and customerId via Environment variables to docker. The result is a structure which is outlined above.

Now the challenge is to tell Spring that it also needs to pick up those extra JARs while bootstrapping the application.
Neither WarLauncher nor JarLauncher will do the trick. **We need to use the PropertiesLauncher**.

When you google the web for “Spring Boot PropertiesLauncher”, you will notice that there are not that many useful
answers how to properly use it and most of them were about using PropertiesLauncher together with a executable JAR,
which is a totally different thing.

Tell your Spring Boot Application to use the PropertiesLauncher
---------------------------------------------------------------

If you are using the Spring Boot plugin of Gradle, its quite simple to tell this plugin how to build the WAR file with a
different Launcher by just adding these lines in your gradle.build file.

```groovy
bootWar {
    enabled = true
    manifest {
        attributes 'Main-Class': 'org.springframework.boot.loader.PropertiesLauncher'
    }
}
```

You can double check the result by unzipping the WAR artifact after build and search for the META-INF/MANIFEST.MF file.
Open it and you should see the reference to the PropertiesLauncher like this:

_Main-Class: org.springframework.boot.loader.PropertiesLauncher_

Now the really interessting part is how to use the PropertiesLauncher on startup, because the problem with this Launcher
is that its defaults regarding folder structure is based more or less on the JAR artifact of Spring Boot, not the WAR
one. This means that if you run this like its mentioned in the docs via:

java -Dloader.path=file:lib/ \\  
-jar application-1.0.0.war

it **wont** work.

In the example i tell the PropertiesLauncher that it should pick up any libraries found in the “lib” folder relative to
the war file. Instead you also need to recreate the classpath structure of the WarLauncher like this:

java -Dloader.path=WEB-INF/lib-provided,WEB-INF/lib, \\  
WEB-INF/classes,file:lib/ \\  
-jar application-1.0.0.war

So by adding all the needed classpaths to the loader.path variable, spring will be able to boostrap the application.

Conclusion
----------

The PropertiesLauncher is a little bit weird to use together with the WAR artifact. It would help tremendously if there
would be another flag for the Launcher where you can specify what kind of artifact you have and let the Launcher create
its main classpath itself.

Something like -Dartifact.type=war|jar would be nice. But apart from that the PropertiesLauncher works as expected. It
loads all other JARs we place into the libs folder.

Also notice that we dont create customer based docker images. We have a more general container which is able to pull the
main application and related customer libraries out of a private AWS S3 repository on startup when needed.

> If you want to know more about well architected applications on cloud platforms or things you need to have a
> successful SaaS business, feel free to head over to [https://okaycloud.de](http://www.okaycloud.de) for more
> information.

[Marc Logemann](https://medium.com/@logemann?source=post_page-----fc49d2d93636--------------------------------)
Marc Logemann