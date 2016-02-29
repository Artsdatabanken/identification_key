# Taxon identification widget
Javascript-based widget implementing a hybrid multiple access key approach for taxon identification, by the [Norwegian Biodiversity Information Centre](artsdatabanken.no) (NBIC/Artsdatabanken).

Based on what is currently known about a taxon, the user is presented with one or more relevant questions in an optimized order, until one taxon remains. This approach can represent all preexisting keys, whether they are purely dichotomous, matrix-based, or anything in between. It also allows for easily expanding/linking data sets with more information, more species and/or additional properties.

## Key features
- Keys (content) are read directly from a standardized spreadsheet format as CSV-files. While other formats exist, these are further removed from the daily, spreadsheet oriented reality of the biologists whose input we rely on. See the [data format guide](Data format (en).md) for more information.
- Required parameters are kept to a bare minimum.
- Code is linked to (but not depending on) other NBIC systems, such as the taxonomic backbone, map service and content management system (CMS).
- The interface is mobile ready and can be used stand-alone or as an iframe widget.
- Accepts a list of taxa that possible outcomes will be filtered by, allowing to run a key for only a particular subset of all of the taxa it distinguishes between.
- Users can choose to see one question at a time and swipe/navigate through these (simple, low threshold), or view a list of questions (more detailed overview of relevant domain knowledge).
- Using durandal, bootstrap, lodash and a bit of jquery.
- MIT licensed.

## Data model overview
The key concepts in the data format and their effect on user experience:
- **Key**: a dataset describing a set of taxa and their diagnostic properties. A key title, its geographic range, intro text, a link to a description in the NBIC CMS and its language can be specified.
- **Taxon**: a possible outcome of the identification. Refers to an entity in the NBIC taxonomic backbone and can have links to a an image file, description in the NBIC CMS, and a follow-up key to further determine a specimen in another key. Can be given a sort order (default sort order is the number of hits in the NBIC [Species Map Service](artskart.artsdatabanken.no))
- **Characters and states**: questions and answers. Can have links to an image file, a description in the NBIC CMS, a logical dependency on previous answers, and a mulit-state property (when several states of one character can be true simultaneously). Can be given a sort order (default sort order is the standard deviation from the 'perfect' question, whose states evenly dismiss a maximum number of the remaining taxa).
- **Taxon-state relationships**: a matrix of numerical values linking taxa to relevant states.
- **Subsets and morphs**: custom subsets of taxa that are not formal taxonomic levels themselves, such as sex, color variations, etc. Subsets will be visible to the user as different outcomes, and questions to distinguish between subsets will be asked even when the taxon containing them is determined. Morphs will not be visible to the user and no questions will be asked to distinguish between morphs within a taxon, but it does allow for a more appropriate image file to be displayed and a different set of taxon-determining questions to be asked.

A data format guide for domain experts (biologists) is available in [English](Data format (en).md)  and [Norwegian](Data format (no).md) .
