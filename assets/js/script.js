const REQUESTAPODURL = 'https://api.nasa.gov/planetary/apod/?api_key=mzTxnxnGx9DLnVoAugcd52XptUxh4FL1XpzOSmyw';
const ONECALLSOLARSYSTEM = 'https://api.le-systeme-solaire.net/rest/bodies/';
//Message to be displayed when our dataset lacks information, which, unfortunately, is
//a fairly frequent occurance even for some of the solar system's less obscure bodies
const INFONOTFOUND = "No information was found in our database.";
//By default, the surface gravity values returned by the solar system API we're using are 
//measured in meters per second squared; this constant will be used to convert them to Gs.
const ONEG = 9.8;

//Some information about our stellar bodies is only accessible under one version of their name, so we need
//objects to handle translation for us
var idToEngName = {};
var engNameToId = {};
var frenchToEngName = {};
//Finally, this one is needed for setting up certain interactable elements
var frenchToId = {};

function getIdToEngName () {
    fetch(ONECALLSOLARSYSTEM)
        .then(function (response){
            return response.json();
        })
        .then(function (data) {
            for (var i = 0; i < data.bodies.length; i++) {
                if (data.bodies[i].englishName !== '') {
                    idToEngName[data.bodies[i].id] = data.bodies[i].englishName;
                    engNameToId[data.bodies[i].englishName] = data.bodies[i].id;
                    //adding all-lowercase versions of English names to engNameToId so users can get a proper
                    //result if they make a correctly-spelled search with improper capitalization
                    engNameToId[data.bodies[i].englishName.toLowerCase()] = data.bodies[i].id;
                    frenchToEngName[data.bodies[i].name] = data.bodies[i].englishName;
                } else {
                //For a few obscure bodies, englishName is missing from the api's data
                //For these, we'll just use their ID
                    idToEngName[data.bodies[i].id] = data.bodies[i].id;
                    engNameToId[data.bodies[i].id] = data.bodies[i].id;
                    frenchToEngName[data.bodies[i].name] = data.bodies[i].id;
                }
                frenchToId[data.bodies[i].name] = data.bodies[i].id;
            }
            //TODO: make note of the names at the bottom that are just using ID, and fix 'em
        })
}

function getApod () {
    fetch(REQUESTAPODURL)
        .then(function (response){
            return response.json();
        })
        .then(function (data) {
            var apodCopyRight = data.copyright;
            var apodExplanation = data.explanation;
            var apodTitle = data.title;
            //Displaying photo and description of astronomy photo of the day 
            $('#apod-img').attr('src', data.url);
            $('#apod-title').text(apodTitle);
            $('#apod-explanation').text(apodExplanation);
            $('#apod-copyright').text("© " + apodCopyRight);
        })
}

//Holding off and only implementing the interactive elements until the page load is complete
$(document).ready(function() {
    //This function handles searchin our api for information about solar bodies and then generating
    //page content
    function solarBodySearch(solarBody) {
        //console.log("Called solarBodySearch with " + solarBody);
        //variable to track whether the search term exists in our database or not; will be set to true if
        //the response upon calling the API is ok. Used to decide whether to display error message or
        //generate text of accordion segment
        var bodyExists = false;
        //And a variable to track if a body has moons
        var hasMoons = false;
        //variable to track what body this body orbits directly around
        var orbitsAround = '';

        //hiding the astronomy photo of the day section when searching for a body
        $('.apod').css('display', 'none');
        //re-hiding the content panel and title
        $('#body-name').css('display', 'none');
        $('#search-break').css('display', 'none');
        $('#search-content').css('display', 'none');
        //Hiding the moons section--this isn't redundant, since we don't want this showing
        //up for bodies that don't have moons
        $('.has-moons').css('display', 'none');

        fetch(ONECALLSOLARSYSTEM + solarBody)
            .then(function (response) {
                if (response.ok) {
                    bodyExists = true;
                    return response.json();
                }
            })
            .then(function (data) {
                //Removing the moons entries if there are any--doing this here rather than
                //above to avoid a duplication glitch caused by the event listeners we add
                //below
                $('.moon-entry').remove();

                if (bodyExists) {
                    //setting text of title field
                    if (data.englishName !== ''){
                        $('#body-name').text(data.englishName);
                    } else {
                        $('#body-name').text(data.id);
                    }

                    //Classification and discovery section
                    $('#body-type-text').text('Classification: ' + data.bodyType);
                    if (data.discoveredBy !== '') {
                        $('#discoverer-text').text('Discovered by: ' + data.discoveredBy);
                        $('#discovery-date-text').text('Discovered on: ' + data.discoveryDate);
                    } else {
                        $('#discoverer-text').text('Knowledge of this body has existed since the beginning of recorded history.');
                        $('#discovery-date-text').text('');
                    }

                    //Orbit and rotation section
                    //Since the sun is the center of the solar system, we have a special check to see
                    //if the body we're looking at is the sun and display a unique message accordingly
                    if (data.englishName === 'Sun'){
                        $('#orbits-around-text').text('The sun is the body around which all planets, asteroids, and comets in the solar system orbit.');
                        $('#orbits').css('display', 'none');
                        $('#apoapsis-text').text('');
                        $('#periapsis-text').text('');
                        $('#orbital-period-text').text('');
                        $('#rotational-period-text').text('');
                    } else {
                        $('orbits').css('display', 'block');
                        if (data.aroundPlanet !== null){
                            //aroundPlanet uses the id of the body the selected body orbits,
                            //so we've gotta translate that to the English name
                            orbitsAround = idToEngName[data.aroundPlanet.planet];
                            $('#orbits-around-text').text('Orbits around: ');
                            $('#orbits').text(orbitsAround);
                            $('#orbits').attr('data-search-term', data.aroundPlanet.planet);
                        } else {
                            orbitsAround = 'the sun';
                            $('#orbits-around-text').text('Orbits around: ');
                            $('#orbits').text(orbitsAround);
                            $('#orbits').attr('data-search-term', 'sun');
                        }   
    
                        if (data.aphelion > 0) {
                            //.toLocaleString('en-US') is a method that takes a number and returns a string formatted
                            //according to the locale passed as an argument
                            $('#apoapsis-text').text('Distance from ' + orbitsAround + ' at farthest point of orbit: ' + data.aphelion.toLocaleString('en-US') + ' kilometers');
                        } else {
                            $('#apoapsis-text').text('Distance from ' + orbitsAround + ' at farthest point of orbit: ' + INFONOTFOUND);
                        }
    
                        if (data.perihelion > 0) {
                            $('#periapsis-text').text('Distance from ' + orbitsAround + ' at closest point of orbit: ' + data.perihelion.toLocaleString('en-US') + ' kilometers');
                        } else {
                            $('#periapsis-text').text('Distance from ' + orbitsAround + ' at closest point of orbit: ' + INFONOTFOUND);
                        }
    
                        if (data.sideralOrbit > 0) {
                            $('#orbital-period-text').text('Length of one full orbit around ' + orbitsAround + ': ' + data.sideralOrbit.toLocaleString('en-US') + ' days');
                        } else {
                            $('#orbital-period-text').text('Length of one full orbit around ' + orbitsAround + ': ' + INFONOTFOUND);
                        }
    
                        if (data.sideralRotation > 0){
                            $('#rotational-period-text').text('Time for one full rotation relative to the stars: ' + data.sideralRotation.toLocaleString('en-US') + ' hours');
                        } else {
                            $('#rotational-period-text').text('Time for one full rotation relative to the stars: ' + INFONOTFOUND)
                        }
                    }   

                    //Size, mass, density, and gravity section
                    if (data.equaRadius > 0) {
                        $('#equa-radius-text').text('Radius at equator: ' + data.equaRadius.toLocaleString('en-US') + ' kilometers');
                    } else {
                        $('#equa-radius-text').text('Radius at equator: ' + INFONOTFOUND);
                    }

                    if (data.polarRadius > 0) {
                        $('#polar-radius-text').text('Radius at poles: ' + data.polarRadius.toLocaleString('en-US') + ' kilometers');
                    } else {
                        $('#polar-radius-text').text('Radius at poles: ' + INFONOTFOUND);
                    }

                    if (data.meanRadius > 0) {
                        $('#mean-radius-text').text('Average radius: ' + data.meanRadius.toLocaleString('en-US') + " kilometers");
                    } else {
                        $('#mean-radius-text').text('Average radius: ' + INFONOTFOUND);
                    }

                    //The mass measurements this api provides are measured in kilograms rather than in metric tons,
                    //and we want to display them in metric tons. Thus, we're subtracting 3 from the mass exponent
                    //--since x * 10^(y) kg is equal to x * 10^(y - 3) tons
                    if (data.mass !== null) {
                        var newExponent = data.mass.massExponent - 3;
                        $('#mass-text').text('Mass: ' + data.mass.massValue + ' * 10^(' + newExponent + ') metric tons' );
                    } else {
                        $('#mass-text').text('Mass: ' + INFONOTFOUND);
                    }

                    //Similarly, the data on density this api provides are measured in grams per cubic centimeter,
                    //and we want to display them in kilograms per cubic meter, so we'll multiply the density
                    //figures the api gives us by 1000
                    //Also, notably, the placeholder value for density in this api is 1, so we have to make
                    //sure we check for that as well when deciding whether to display an error message or not
                    if (data.density > 0 && data.density !== 1) {
                        var convertedDensity = data.density * 1000;
                        $('#density-text').text('Density: ' + convertedDensity.toLocaleString('en-US') + ' kilograms per cubic meter')
                    } else {
                        $('#density-text').text('Density: ' + INFONOTFOUND);
                    }

                    //Finally, gravity is given in meters per second squared, so to convert it to Gs, we just
                    //have to divide by 9.8
                    if (data.gravity > 0) {
                        var gravityGs = data.gravity/ONEG;
                        //rounding the surface gravity to five decimal places
                        $('#gravity-text').text('Surface gravity: ' + gravityGs.toFixed('5') + 'Gs');
                    } else {
                        $('#gravity-text').text('Surface gravity: ' + INFONOTFOUND);
                    }

                    //Moons section: only to be filled out and then rendered if body has moons
                    if (data.moons !== null) {
                        hasMoons = true;
                        for (var i = 0; i < data.moons.length; i++){
                            var newMoonEl = $('<p>');
                            //The entries in data.moons only have their French name, so we
                            //have to translate that to the English name
                            newMoonEl.text(frenchToEngName[data.moons[i].moon]);
                            newMoonEl.addClass('moon-entry');
                            newMoonEl.addClass('search-this-body');
                            //Assigning the property that we'll use to set up links
                            newMoonEl.attr('data-search-term', frenchToId[data.moons[i].moon]);
                            $('#moons-div').append(newMoonEl);
                        }
                    }

                    //Image: display either a photo of the body from NASA's database, or
                    //if one could not be found, a placeholder
                    console.log("About to generate an image");
                    if (BODIES[data.englishName] !== '' && BODIES[data.englishName] !== undefined) {
                        $('#body-image').attr('src', BODIES[data.englishName]);
                    } else if (BODIES[data.id] !== '' && BODIES[data.id] !== undefined) {
                        $('#body-image').attr('src', BODIES[data.id]);
                    } else {
                        $('#body-image').attr('src', 'https://cdn.discordapp.com/attachments/929118260887171123/931643733370347530/not-found.png');
                    }

                    //finally, revealing content panel
                    $('#body-name').css('display', 'block');
                    $('#search-break').css('display', 'block');
                    $('#search-content').css('display', 'block');
                    if(hasMoons){
                        $('.has-moons').css('display', 'block');
                    }

                    //Clicking on an element of the page with the search-this-body class calls 
                    //solarBodySearch using that element's data-search-term attribute, which should 
                    //contain its id
                    $('.moon-entry').on('click', function(event){
                        console.log("Clicked on .moon-entry")
                        solarBodySearch($(event.target).attr('data-search-term'));
                    });

                } else {
                    //displaying error message in title field
                    $('#body-name').text(INFONOTFOUND);
                    $('#body-name').css('display', 'block');
                }
            })
    }

    //Event listeners
    $('#orbits').on('click', function(event){
        console.log("Cliked on #orbits");
        solarBodySearch($(event.target).attr('data-search-term'));
    });

    $('form').on('submit', function (event) {
        event.preventDefault()
        //$('.apod-container').addClass('hide');
        //$('.apod-container').css('display', 'none');
        var solarBody = engNameToId[$('#planet-input').val()];
        $('#planet-input').val('');
        solarBodySearch(solarBody);
    })
})

getIdToEngName();
getApod();

