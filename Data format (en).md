# NBIC's identification key widget
###### Concepts and data format

## About the key
There are several types of digital identification keys. In the pathway type a user is presented one question at a time in a fixed order, until one arrives at a single result. At the other end of the spectrum, the random access variant allows the user to filter the list of possible outcomes by selecting properties, so that one may be left with only one result in the end.

NBIC's key solution is of the third, hybrid type. Based on what is known about the taxon, the user is presented with one or more questions. This makes it possible to represent all preexisting keys, whether they are purely dichotomous, matrix-based, or anything in between. It also allows for easily expanding key data sets later with more information, more species and/or additional properties.

The key's content is stored as a spreadsheet. It is possible to represent a wide array of various parameters and conditions, but only very few are required. This documents discusses all possibilities, but its length and complexity is no need to worry: most keys will not use all fields. If you have an existing key, or a start of a concept, we'll be happy to help convert it into our format.

## Data model and concepts
In addition to some information on the key itself, the key consists of taxa (species or any higher/lower taxonomic level), properties, and relationships between species and properties. An overview of the types of information key can contain (only parameters with a :exclamation: are required):

### Information about the key
:exclamation:**Name**: Title of the key, e.g. “Deer”.  
**Geographic range**: The area for which the key is valid, e.g. “Spitsbergen”.  
**Intro**: Short text about the key (html allowed).  
**Description**: ID of an article describing the key on NBIC's site.  
**Language**: the language of the key, e.g. "En-us”.  

### Taxa
**Name**: Name of the taxon. This field is used only for temporary display while the species name is fetched from the NBIC taxonomic backbone. Useful for increased readability of the spreadsheet too however.  
:exclamation:**Taxon**: ID of the taxon in the NBIC taxonomic backbone. NBIC can assist in converting a list of scientific names into a list of ID-numbers.  
**Media element**: ID or url of a picture depicting the taxon.  
**Description**: ID of an article describing the taxon on NBIC's site.   
**Subset**: it is possible to define subsets of taxa: one or several sublevels of a taxon with different sets of properties, that one wishes to let the user identify separately. For example male/female of the same species (the user will then be presented questions to distinguish between the two, also when the species has already been identified.)  
**Morph**: it is possible to define morphs of taxa: one or several sublevels of a taxon with different sets of properties, that one does not wish to let the user identify separately. For example regular/melanistic individuals of the same species (the user will then not be presented questions to distinguish between the two, it suffices that the species has been identified.)  
**Sort order**: a sort order in which the list of taxa is to be shown. When the sort index is unique for all taxa it will override the sorting completely. Taxa without an index, or sharing the same index, will be sorted (descending) in order of number of hits in the NBIC Species Map Service.  
**Follow-up**: a link to a follow-up key, allowing the user to further identify the result to a lower taxon level.

### Properties
:exclamation:**Question**: the property, e.g. “What is the color of the wings?” or just “Wing color”.   
:exclamation:**Answer**: one of the possible answers belonging to a question, e.g. “Yellow”.  
**Question type**: whether or not the question can have several valid answers within an individual, for example when "black" and "red" both are to be checked to indicate an individual is red with black dots.   
**Question requirement**: a logical requirement defining when the question may be asked. For example to only display a question on wing color when it is known that the result is both an insect and that it has wings.   
**Question description**: ID of an article describing the property (question) on NBIC's site.   
**Sort order**: a sort order in which the questions are to be shown. When the sort index is unique for all questions it will override the sorting completely. Questions without an index, or sharing the same index (for example to distinguish between field versus lab versus microscopic properties), will be sorted (descending) by the  standard deviation from the 'perfect' question (with the highest average chance of excluding as many results as possible).  
**Media element**: ID or url of a picture depicting the current answer alternative.    

### Taxon-property links
Properties (answers) and taxa can have several types of links. These are denoted with numerical values:

| Value | Interpretation |
| --- | --- |
| 1 | individuals belonging to this taxon always have this property |
| 0 | individuals belonging to this taxon never have this property |
| 0.xx | individuals belonging to this taxon have this property in xx % of the cases |
|  | it is irrelevant/unspecified whether or not individuals belonging to this taxon have this property |

## The data format
The key's content is saved as a spreadsheet. Bold text in the examples below are keywords, that have to be spelled thus for correct parameter interpretation by the module. Those that are not used within a data set may be omitted.

A minimal key, with only required fields can look like this:

|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| **Key name** | Example | **Taxon** | 4515 | 83770 |
| **Character** | **State**   |       | | |
| Has feathers/fur | Feathers | | 1 | 0 |
| | Fur | | 0 | 1 |
| Color | White | | 1 | 0.5 |
| | Brown | | 0 | 0.5 |

This gives a working key that distinguishes between the snowy owl (with taxon ID 4515) and the arctic fox (837700). It would be sufficient to specify whether the animal has feathers or fur, but for the sake of this example color is included too here. Not all arctic foxes are white, so white and brown both have a value between 0 and 1.

### Information about the key
Information about the key is listed in the top left corner of the spreadsheet. In its most complete form, the fields look as follows:

|  | |
| --- | --- |
| **Key name** | Example |
| **Geographic range** | Mainland Norway |
| **Language** | No-nb |
| **Key intro** | This is an example key describing some of the species found on Norway's mainland. |
| **Key description** | 180944 |

**Key name** is the name of the key.   
**Geographic range** is the area the key is valid for.   
**Language** is the language used in the key data.   
**Key intro** is a short description of the key.   
**Key description** ID of an article describing the key on NBIC's site.   

### Properties
Parameters linked to properties, aka questions and answers (characters og states) get a column each, below the information about the key and the last row with a parameters concerning taxa. In its most complete form, the fields look as follows:

Character | State | Multistate character | Character requirement | Description | State id | State media | Sort
--- | --- | --- | --- | --- | --- | --- | ---
Number of legs | 6 |  | | 63445 | 6legs | 2342 | 1
           | 2 | | |        | 2legs | 6774 |
Wings | Has wings | | | 6345533 | wings | 3466 | 1
Wing color | Red | TRUE | {wings} && {6legs} | 3343435 |  | http://www.blablabla.no | 2
 | Black | | | |  | 23552 |
 | Blue   | | | | | |

**Character** and **state** are the question and its possible answers. Any number of alternatives from one to many is supported. The wing question in the example has only one alternative, and the user will be able to answer positively or negatively. It is also possible to include two alternatives: has wings versus does not have wings, that the user then can choose from.   
**Multi-state character** denotes whether or not multiple answers can be true simultaneously, for example when wings are red with black dots. If nothing is specified it is assumed not to be the case: individuals either have 6 or 2 legs.   
**Character requirement** provides the opportunity to specify a logical rule that must be fulfilled before a question may be displayed. Answers can be referred to via **State id**,
between {}, as in the example above. It accepts javascript notation: "!" for 'not', "&&" for 'and', and "||" for 'or', and as many parentheses "()" as you want. This way complicated rules can be defined: (A || B) && ((!C && !D) || (E && !F)): A or B, while not C and not D, and/or E and not F.   
**Description** is the ID of an article describing the character and its possible states on NBIC's site.    
**State media** is an ID or url of a picture depicting the current answer alternative on NBIC's or an external site.  
**Sort** is the sorting index. Sort primarily takes into account this index, and after that the standard deviation from the 'perfect' question (with the highest average chance of eliminating as many results as possible).   

### Taxa
Parameters linked to the keys possible results (taxa) get a row each, right of the general information about the key and the last column with a parameter describing characters and states. In its most complete form, the fields look as follows:

| | | | | | |
| --- | --- | --- | --- | --- | --- |
|**Name** | Arctic fox male | Arctic fox female | Golden-belted bumblebee (normal) | Golden-belted bumblebee (melanistic) | Cod |
|**Taxon** | 83770 | 83770 | 634534 | 634534 | 466437 |
|**Subset** | ♂ | ♀ | | |  |
|**Morph** | | | | Melanistic |  |
|**Media** | 4534 | 7445 | 23423 | 12245 | 7456 |
|**Description** | 346773 | 346773 | 345744 | 345744 | 967343 |
|**Followup** | | | | | /Files/13512&taxa=84373 |

**Name** is a parameter that is displayed while the taxon name is fetched from the NBIC taxonomic backbone. It also makes the spreadsheet more readable.   
**Taxon** is the ID of the taxon in the NBIC taxonomic backbone.   
**Subset** defines a sub-level of the taxon by having several columns with the same taxon ID, each with a different subset name. Such individuals have a unique set of properties, and one wants to allow the user to identify the right subset. In this example the sex of the Arctic fox (the user will be presented questions to determine the sex of the individual, also when it is already known that it is an Arctic fox).   
**Morphs** define a sub-level of the taxon by having several columns with the same taxon ID and subset, with or without a morph name. Such individuals have a unique set of properties, but one does not want to allow the user to identify the exact morph. In this example the normal/melanistic variant of the Golden-belted bumblebee (the user will not be presented questions to determine the type of individual, it is sufficient to determine that it is a Golden-belted bumblebee). If a morph with a specified name happens to be known in the end it will be shown.
**Media** is an ID or url of a picture depicting the taxon on NBIC's or an external site.  
**Description** is the ID of an article describing the taxon on NBIC's site.       
**Followup** is a url to a follow-up key, that the user can choose to go to in order to identify the individual to an even lower level. By specifying a comma-separated list of taxon IDs in the url as *&taxa=x,y* one can specify that only subtaxa of taxa x and y are relevant. It is usually a good idea to specify the current result ID when referring to another key, as that key may include a larger group of taxa.

### More examples
A realistic example containing a relatively straightforward key:

| | | | | | | |
| --- |  --- | --- | --- | --- | --- | --- |
| **Key name** | Example | | | **Name** | Snowy owl | Arctic fox |
| **Key intro** | Test key intro text | | | **Taxon** | 4515 | 83770 |
| **Key description** | 664564 | | | **Media** | 67345 | 57564 |
| | | | | **Description** | 774566 | 632346 |
| **Character** | **State** | **Description** | **State media** | | | |
| Has feathers/fur | Feathers | 456353 | 65655 | | 1 | 0 |
|  | Fur | | 87684 | | 0 | 1 |
| Color | White | 745626 | 73455 | | 1 | 0.5 |
| | Brown | | 78435 | | 0 | 0.25 |
| | Gray | | 65454 | | 0 | 0.25 |
